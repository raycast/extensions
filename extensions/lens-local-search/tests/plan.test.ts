import assert from "node:assert/strict";
import { test } from "node:test";
import { compilePlan, describePlan, planMedium, type Answer, type Question } from "../src/plan.ts";

const signal = () => new AbortController().signal;
function replay(steps: { op: string; value?: string; source?: string; negated?: boolean }[]) {
  let step = -1;
  return async (state: string, questions: Record<string, Question>) => {
    const data = JSON.parse(state);
    const name = Object.keys(questions)[0];
    if (name === "operation") step++;
    if (name === "supported") return { supported: { choice: "yes" } };
    const current = steps[step];
    assert.ok(current, "planner requested an unexpected step");
    if (name === "value" && data.selectedOperation !== "subject") assert.equal(data.selectedOperation, current.op, "value selection must be bound to the chosen operation");
    const targetValue = name === "value" ? current.source ?? current.value : current.value;
    const choice = name === "operation" ? current.op : Object.keys(questions[name].criteria).find((key) => questions[name].criteria[key] === targetValue || key === targetValue)!;
    assert.ok(choice && Object.hasOwn(questions[name].criteria, choice), `missing choice for ${name}: ${current.value ?? current.op}`);
    const answers: Record<string, Answer> = { [name]: { type: "choice", choice, confidence: 0.95, probabilities: { [choice]: 0.95 } } };
    if (questions.filename_scope) {
      const scope = steps.some((s) => s.op.startsWith("name_")) ? "explicit" : "descriptive";
      answers.filename_scope = { choice: scope, confidence: 1, probabilities: { [scope]: 1 } };
    }
    if (questions.supported) answers.supported = { choice: steps.some((s) => s.op === data.proposedCondition.op && s.value === data.proposedCondition.value && s.negated) ? "negated" : "yes" };
    if (questions.coverage) answers.coverage = { choice: "complete" };
    if (questions.core) {
      const target = Object.values(questions.core.criteria).includes(current.value!) ? current.value! : data.semantic.join(" ").split(/\s+/).at(-1);
      answers.core = { choice: Object.keys(questions.core.criteria).find((k) => questions.core.criteria[k] === target) };
    }
    return answers;
  };
}

test("decision operations compose independent literals instead of matching sentence patterns", async () => {
  const plan = await compilePlan("pdfs where the name starts with RE and they include a 2 in the name", "auto", replay([
    { op: "ext_is", value: "pdf", source: "pdfs" }, { op: "name_prefix", value: "RE" }, { op: "name_contains", value: "2" }, { op: "and" }, { op: "and" }, { op: "done" },
  ]), signal());
  assert.deepEqual(plan.filter, { op: "and", args: [{ op: "ext_is", value: "pdf" }, { op: "and", args: [{ op: "name_prefix", value: "RE" }, { op: "name_contains", value: "2" }] }] });
  assert.equal(plan.complete, true); assert.match(describePlan(plan), /starts with “RE”.*AND.*contains “2”/);
});
test("boolean grouping and negation use the same composable primitives", async () => {
  const result = await compilePlan("Find Alpha or Beta without draft", "auto", replay([
    { op: "name_contains", value: "Alpha" }, { op: "name_contains", value: "Beta" }, { op: "or" }, { op: "name_contains", value: "draft", negated: true }, { op: "not" }, { op: "and" }, { op: "done" },
  ]), signal());
  assert.equal(result.filter?.op, "and"); assert.equal(result.filter.args?.[0].op, "or"); assert.equal(result.filter.args?.[1].op, "not");
});
test("subjects, metadata and file medium compose without inventing filename conditions", async () => {
  const result = await compilePlan("images of blue waves larger than 2 MB", "auto", replay([
    { op: "kind_is", value: "image", source: "images" }, { op: "semantic", value: "blue waves" }, { op: "size_gt", value: "2 MB" }, { op: "and" }, { op: "done", value: "waves" },
  ]), signal());
  assert.equal(result.semantic, "blue waves"); assert.equal(result.subject, "waves"); assert.equal(result.filter?.args?.[1].value, "2000000");
  assert.doesNotMatch(JSON.stringify(result), /name_/);
});
test("untrusted operations, invalid spans, unresolved values, unfinished stacks and repeats cannot become an executable completed plan", async () => {
  await assert.rejects(compilePlan("find private files", "auto", async () => ({ operation: { choice: "run_shell" } }), signal()), /Invalid search-plan/);
  await assert.rejects(compilePlan("files larger than 20 pixels", "auto", replay([{ op: "size_gt", value: "20 pixels" }]), signal()), /byte unit/);
  await assert.rejects(compilePlan("files larger than elephant", "auto", replay([{ op: "size_gt", value: "elephant" }]), signal()), /numeric/);
  await assert.rejects(compilePlan("files with A and B", "auto", replay([{ op: "name_contains", value: "A" }, { op: "name_contains", value: "B" }, { op: "unsupported" }]), signal()), /not combined/);
  await assert.rejects(compilePlan("files with A", "auto", replay([{ op: "name_contains", value: "A" }, { op: "name_contains", value: "A" }]), signal()), /missing choice/);
});
test("partial plans and low confidence are visible; cancellation stops further model calls", async () => {
  const result = await compilePlan("find an unsupported property", "auto", async () => ({ operation: { choice: "unsupported", confidence: 0.2 }, filename_scope: { choice: "descriptive" } }), signal());
  assert.equal(result.complete, false); assert.equal(result.uncertain, true); assert.match(describePlan(result), /could not be applied/);
  const abort = new AbortController(); abort.abort();
  await assert.rejects(compilePlan("search for files", "auto", async () => { throw new Error("must not call"); }, abort.signal), /abort/i);
});
test("manual file medium stays authoritative and long literals are not limited to a small phrase dictionary", async () => {
  const query = Array.from({ length: 25 }, (_, i) => `word${i}`).join(" ");
  let calls = 0;
  const result = await compilePlan(query, "documents", async (state, questions): Promise<Record<string, Answer>> => {
    calls++; const data = JSON.parse(state); const name = Object.keys(questions)[0];
    if (name === "operation") { assert.equal(questions.operation.criteria.kind_is, undefined); return { filename_scope: { choice: "descriptive" }, operation: { choice: calls === 1 ? "semantic" : "done" }, ...(questions.core ? { core: { choice: "0_0" } } : {}), ...(questions.coverage ? { coverage: { choice: "complete" } } : {}) }; }
    if (name === "supported") return { supported: { choice: "yes" } };
    if (name === "start") return { start: { choice: "t0" } };
    assert.ok(["semantic", "subject"].includes(data.selectedOperation)); return { value: { choice: "t24" } };
  }, signal());
  assert.equal(result.semantic, query);
});

test("a condition not entailed by the request is rejected before execution and does not survive in the plan", async () => {
  const play = replay([{ op: "name_contains", value: "ecology" }, { op: "name_lacks", value: "draft" }, { op: "semantic", value: "ecology" }, { op: "done", value: "ecology" }]);
  const result = await compilePlan("notes about ecology without draft in the filename", "auto", async (state, questions) => {
    if (questions.supported && JSON.parse(state).proposedCondition.value === "ecology") return { supported: { choice: "no" } };
    return play(state, questions);
  }, signal());
  assert.deepEqual(result.filter, { op: "name_lacks", value: "draft" });
  assert.equal(result.semantic, "ecology"); assert.equal(result.subject, "ecology");
  assert.equal(result.uncertain, true);
});

test("independent entailment and subject decisions share operation calls; missing whole-request coverage stays visible", async () => {
  let calls = 0, batched = false;
  const play = replay([{ op: "ext_is", value: "pdf" }, { op: "semantic", value: "ecology" }, { op: "and" }, { op: "done", value: "ecology" }]);
  const p = await compilePlan("pdf documents about ecology", "auto", async (state, questions) => {
    calls++; batched ||= Boolean(questions.operation && questions.supported);
    // Use a valid single hard condition and semantic subject; no unnecessary boolean operation.
    const data = JSON.parse(state);
    if (questions.operation && data.semantic.length) return { operation: { choice: "done" }, core: { choice: Object.keys(questions.core.criteria).find(k => questions.core.criteria[k] === "ecology") }, coverage: { choice: "partial" } };
    return play(state, questions);
  }, signal());
  assert.ok(batched); assert.ok(calls <= 6); assert.equal(p.complete, false); assert.equal(p.uncertain, true);
  assert.match(describePlan(p), /could not be applied/);
});


test("the executed plan owns medium routing and preserves mixed boolean scopes", () => {
 assert.equal(planMedium({op:"or",args:[{op:"kind_is",value:"image"},{op:"kind_is",value:"documents"}]}),"all");
 assert.equal(planMedium({op:"and",args:[{op:"kind_is",value:"image"},{op:"or",args:[{op:"name_is",value:"A"},{op:"name_is",value:"B"}]}]}),"image");
 assert.equal(planMedium({op:"or",args:[{op:"kind_is",value:"image"},{op:"name_is",value:"B"}]}),"all");
 assert.equal(planMedium({op:"not",args:[{op:"kind_is",value:"image"}]}),"all");
});

test('negated groups keep their atomic conditions and validate polarity on the final tree',async()=>{
 const play=replay([{op:'ext_is',value:'pdf',source:'PDFs'},{op:'kind_is',value:'image',source:'images'},{op:'or'},{op:'not'},{op:'done'}]);
 const plan=await compilePlan('files that are neither PDFs nor images','auto',async(state,questions):Promise<Record<string,Answer>>=>{
  const answers=await play(state,questions);
  if(questions.supported) answers.supported={choice:'negated'};
  return answers;
 },signal());
 assert.equal(plan.complete,true);assert.equal(plan.filter?.op,'not');assert.equal(plan.filter?.args?.[0].op,'or');
});
test('a negative atomic condition cannot finish as a positive predicate',async()=>{
 const play=replay([{op:'ext_is',value:'pdf',source:'PDFs'},{op:'done'},{op:'not'},{op:'done'}]);
 const plan=await compilePlan('files except PDFs','auto',async(state,questions):Promise<Record<string,Answer>>=>{
  const answers=await play(state,questions);
  if(questions.supported) answers.supported={choice:'negated'};
  return answers;
 },signal());
 assert.equal(plan.filter?.op,'not');assert.equal(plan.complete,true);
});

test("early encoder preparation happens only when the plan has semantic content", async () => {
 let prepared = 0;
 await compilePlan("PDFs named RE", "auto", replay([{ op: "ext_is", value: "pdf", source: "PDFs" }, { op: "done" }]), signal(), () => { prepared++; });
 assert.equal(prepared, 0, "literal-only queries keep the encoder stopped");
 const plan = await compilePlan("blue sweaters", "auto", replay([{ op: "semantic", value: "blue sweaters" }, { op: "done", value: "sweaters" }]), signal(), () => { prepared++; });
 assert.equal(prepared, 1); assert.equal(plan.semantic, "blue sweaters");
});

test('descriptive search intent prevents a plausible operation from imposing filename requirements',async()=>{
 for(const query of ['kth exam','stockholm rent contract','vaccination certificate','database transaction retry']){
  let first=true;
  const plan=await compilePlan(query,'auto',async(state,questions):Promise<Record<string,Answer>>=>{
   const data=JSON.parse(state);
   if(questions.filename_scope){assert.equal(first,true);first=false;return {filename_scope:{choice:'descriptive',confidence:1,probabilities:{descriptive:1}},operation:{choice:'name_contains'}};}
   if(questions.operation){assert.equal(questions.operation.criteria.name_contains,undefined);return {operation:{choice:data.semantic.length?'done':'semantic'},...(questions.core?{core:{choice:Object.keys(questions.core.criteria).at(-1)}}:{}),...(questions.coverage?{coverage:{choice:'complete'}}:{})};}
   return {value:{choice:Object.keys(questions.value.criteria).find((key)=>questions.value.criteria[key]===query)}};
  },signal());
  assert.equal(plan.filter,undefined);assert.equal(plan.semantic,query);assert.equal(plan.complete,true);
 }
});
test('uncertain filename-field intent cannot authorize a mandatory name filter',async()=>{
 let started=false;
 const plan=await compilePlan('conference notes','auto',async(state,questions):Promise<Record<string,Answer>>=>{
  const data=JSON.parse(state);
  if(!started){started=true;return {filename_scope:{choice:'explicit',confidence:.55,probabilities:{explicit:.55}},operation:{choice:'name_contains'}};}
  if(questions.operation)return {operation:{choice:data.semantic.length?'done':'semantic'},...(questions.core?{core:{choice:'0_1'}}:{}),...(questions.coverage?{coverage:{choice:'complete'}}:{})};
  return {value:{choice:'0_1'}};
 },signal());
 assert.equal(plan.filter,undefined);assert.equal(plan.semantic,'conference notes');assert.equal(plan.uncertain,true);
});

 test('a document role can be the focus while its affiliation remains in the full semantic request',async()=>{
  const play=replay([{op:'semantic',value:'Acme contract'},{op:'done',value:'contract'}]);
  const plan=await compilePlan('Acme contract','auto',async(state,questions)=>{
   if(questions.core){assert.match(questions.core.instructions,/document role/);assert.match(questions.core.instructions,/complete semantic description/);}
   return play(state,questions);
  },signal());
  assert.equal(plan.subject,'contract');assert.equal(plan.semantic,'Acme contract');assert.equal(plan.filter,undefined);
 });

test('overlapping semantic spans retain query order and context without repeating phrases or warmup',async()=>{
 let warmups=0;
 const query='lecture about the cross product of two vectors';
 const plan=await compilePlan(query,'auto',replay([
  {op:'semantic',value:'about the cross product of two vectors'},
  {op:'semantic',value:'lecture about the cross product of two vectors'},
  {op:'done',value:'lecture'},
 ]),signal(),()=>{warmups++;});
 assert.equal(plan.semantic,query);assert.equal(plan.subject,'lecture');assert.equal(warmups,1);
 const partial=await compilePlan('notes on coastal flooding and habitat restoration','auto',replay([
  {op:'semantic',value:'coastal flooding and habitat'},
  {op:'semantic',value:'flooding and habitat restoration'},
  {op:'done',value:'habitat'},
 ]),signal());
 assert.equal(partial.semantic,'coastal flooding and habitat restoration');
});

test('long-query semantic spans use the selected start and end tokens when merging',async()=>{
 const words=Array.from({length:24},(_,i)=>`word${i}`),query=words.join(' ');let step=-1;
 const spans=[[3,8],[6,10]];
 const plan=await compilePlan(query,'auto',async(_state,questions)=>{
  const answers:Record<string,Answer>={};
  if(questions.operation){step++;answers.operation={choice:step<2?'semantic':'done'};}
  if(questions.filename_scope)answers.filename_scope={choice:'descriptive',confidence:1,probabilities:{descriptive:1}};
  if(questions.start)answers.start={choice:`t${spans[step][0]}`};
  if(questions.value)answers.value={choice:`t${spans[step][1]}`};
  if(questions.core)answers.core={choice:Object.keys(questions.core.criteria)[0]};
  if(questions.coverage)answers.coverage={choice:'complete'};
  return answers;
 },signal());
 assert.equal(plan.semantic,words.slice(3,11).join(' '));
});
