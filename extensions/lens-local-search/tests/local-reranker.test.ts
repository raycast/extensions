import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {configurationFromPreferences} from '../src/backend.ts';
import {scoreLocally,fuseRelevance,rerankLocally} from '../src/local-reranker.ts';
const config={...configurationFromPreferences({},'/tmp/assets','/tmp/lens-rerank-test'),binary:fileURLToPath(new URL('fixtures/relevance.mjs',import.meta.url))};
test('local content scoring uses opaque ids, validates model output, and stops on cancellation',async()=>{
 const candidates=[{id:'r0',text:'ordinary text'},{id:'r1',text:'relevant evidence'}];
 assert.deepEqual(await scoreLocally(config,'topic',candidates,new AbortController().signal),{r0:0.05,r1:0.95});
 await assert.rejects(scoreLocally(config,'invalid',candidates,new AbortController().signal),/Invalid relevance/);
 const abort=new AbortController();const pending=scoreLocally(config,'wait',candidates,abort.signal);setTimeout(()=>abort.abort(),40);
 await assert.rejects(pending,/abort/i);
});
test('uncertain pointwise scores retain retrieval evidence, while decisive content evidence can change the order',()=>{
 const base={path:'/a.jpg',kind:'image',segment:'image',segment_id:1,modified:1,size:1,info:{}};
 const a={...base,score:4}, b={...base,path:'/b.jpg',score:3.9}, weak={...base,path:'/weak.jpg',score:0.5};
 const result={hits:[a,b,weak],strong:2,meaning:true};
 assert.deepEqual(fuseRelevance(result,result.hits,{r0:0.45,r1:0.44,r2:0.46}).map(r=>r.hit),[a,b,weak]);
 assert.equal(fuseRelevance(result,result.hits,{r0:0.1,r1:0.9,r2:0.1})[0].hit,b);
});
test('a weak extra candidate is not automatically promoted above strong unscored results',()=>{
 const base={path:'/a.jpg',kind:'image',segment:'image',segment_id:1,modified:1,size:1,info:{}};
 const a={...base,score:4},unscored={...base,path:'/unscored.jpg',score:3.8},weak={...base,path:'/weak.jpg',score:.5};
 const result={hits:[a,unscored,weak],strong:2,meaning:true};
 assert.deepEqual(fuseRelevance(result,[a,weak],{r0:.45,r1:.46}).map(r=>r.hit),[a,unscored,weak]);
});

test('a corrupt derived relevance cache is replaced without breaking content ranking',async(t)=>{
 const root=mkdtempSync(join(tmpdir(),'lens-relevance-cache-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const folder=join(root,'models','reranker');mkdirSync(folder,{recursive:true});writeFileSync(join(folder,'enabled.json'),'{}');
 writeFileSync(join(root,'relevance-cache.json'),'null');
 const local={...config,index:root,models:join(root,'models')};
 const a={path:'/a.md',kind:'doc',segment:'chunk',segment_id:1,modified:1,size:1,score:1,info:{}};
 const b={...a,path:'/b.md',segment_id:2};const result={hits:[a,b],strong:2,meaning:true};
 const service={request:async(r:Record<string,unknown>)=>({text:r.segment===2?'relevant evidence':'ordinary text'})};
 const ranked=await rerankLocally(local,service as never,'topic',result,new AbortController().signal);
 assert.equal(ranked.reranked,2);assert.equal(ranked.hits[0].path,b.path);assert.equal(ranked.rankingNotice,undefined);
 assert.equal(typeof JSON.parse(readFileSync(join(root,'relevance-cache.json'),'utf8')),'object');
});

test('warm relevance skips evidence preparation; version, query and model changes invalidate it',async(t)=>{
 const root=mkdtempSync(join(tmpdir(),'lens-fast-relevance-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const folder=join(root,'models','reranker');mkdirSync(folder,{recursive:true});writeFileSync(join(folder,'enabled.json'),'{}');
 const local={...config,index:root,models:join(root,'models')};
 const a={path:'/a.md',kind:'doc',segment:'chunk',segment_id:1,modified:1,size:1,score:1,info:{}};
 const b={...a,path:'/b.md',segment_id:2};const result={hits:[a,b],strong:2,meaning:true};
 let reads=0;
 const service={request:async(r:Record<string,unknown>)=>{reads++;return {text:r.segment===2?'relevant evidence':'ordinary text'};}};
 const first=await rerankLocally(local,service as never,'topic',result,new AbortController().signal);
 assert.equal(reads,2);
 const cached=await rerankLocally({...local,binary:'/must-not-spawn'},service as never,'topic',result,new AbortController().signal);
 assert.deepEqual(cached,first);assert.equal(reads,2,'cache lookup precedes evidence reads and process launch');
 const changed={...result,hits:[{...a,modified:2},b]};
 await rerankLocally(local,service as never,'topic',changed,new AbortController().signal);assert.equal(reads,4);
 await rerankLocally(local,service as never,'other topic',changed,new AbortController().signal);assert.equal(reads,6);
 writeFileSync(join(folder,'enabled.json'),'{"revision":2}');
 await rerankLocally(local,service as never,'other topic',changed,new AbortController().signal);assert.equal(reads,8);
});

test('evidence preparation uses at most two workers and preserves the original candidate order',async(t)=>{
 const root=mkdtempSync(join(tmpdir(),'lens-parallel-evidence-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'models','reranker'),{recursive:true});writeFileSync(join(root,'models','reranker','enabled.json'),'{}');
 const hits=Array.from({length:6},(_,i)=>({path:`/${i}.md`,kind:'doc',segment:'chunk',segment_id:i,modified:1,size:1,score:1,info:{}}));
 let busy=0,peak=0;
 const service={request:async(r:Record<string,unknown>)=>{
  busy++;peak=Math.max(peak,busy);await new Promise(resolve=>setTimeout(resolve,r.segment===0?25:2));busy--;
  return {text:r.segment===4?'relevant evidence':'ordinary text'};
 }};
 const ranked=await rerankLocally({...config,index:root,models:join(root,'models')},service as never,'topic',{hits,strong:6,meaning:true},new AbortController().signal);
 assert.equal(peak,2);assert.equal(ranked.reranked,6);assert.equal(ranked.hits[0].path,'/4.md');
 assert.deepEqual(ranked.hits.slice(1).map(h=>h.path),['/0.md','/1.md','/2.md','/3.md','/5.md']);
});

test('PDF text is judged directly; independent passages choose the right page without duplicate files',async(t)=>{
 const root=mkdtempSync(join(tmpdir(),'lens-pdf-evidence-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'models','reranker'),{recursive:true});writeFileSync(join(root,'models','reranker','enabled.json'),'{}');
 const pdf={path:'/anonymous.pdf',kind:'pdf',segment:'page',segment_id:1,loc:1,modified:1,size:1,score:1,info:{},passages:[
  {segment:'page',segment_id:1,loc:1,excerpt:'Ordinary introduction'},
  {segment:'page',segment_id:2,loc:9,excerpt:'«relevant» evidence'},
 ]};
 const other={...pdf,path:'/other.md',kind:'doc',segment:'chunk',segment_id:3,passages:undefined};
 const requests:unknown[]=[];
 const service={request:async(r:Record<string,unknown>)=>{requests.push(r);assert.equal(r.op,'text','readable PDFs must not render a thumbnail for content ranking');return {text:r.segment===2?'relevant evidence':'ordinary text'};}};
 const result={hits:[other,pdf],strong:2,meaning:true};
 const ranked=await rerankLocally({...config,index:root,models:join(root,'models')},service as never,'topic',result,new AbortController().signal);
 assert.equal(ranked.hits.length,2);assert.equal(ranked.hits[0].path,pdf.path);assert.equal(ranked.hits[0].loc,9);assert.equal(ranked.hits[0].segment_id,2);
 assert.equal(ranked.reranked,2);assert.equal(requests.length,3);
 const cached=await rerankLocally({...config,index:root,models:join(root,'models'),binary:'/must-not-launch'},service as never,'topic',result,new AbortController().signal);
 assert.deepEqual(cached,ranked);assert.equal(requests.length,3);
});

test('content ranking centres long text on verified keyword evidence instead of truncating away the match',async()=>{
 const {passageText}=await import('../src/local-reranker.ts');
 const text='Ordinary introduction. '.repeat(500)+'zirconium cooling procedure.';
 const evidence=passageText(text,'the «zirconium» procedure');
 assert.ok(evidence.includes('zirconium'));assert.ok(evidence.length<=4201);
 assert.equal(passageText('actual words','«invented»'),'actual words');
});

test('a matching filename cannot masquerade as matching document contents',async(t)=>{
 const root=mkdtempSync(join(tmpdir(),'lens-content-only-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'models','reranker'),{recursive:true});writeFileSync(join(root,'models','reranker','enabled.json'),'{}');
 const a={path:'/relevant evidence.pdf',kind:'pdf',segment:'page',segment_id:1,modified:1,size:1,score:1,info:{}};
 const b={...a,path:'/anonymous.pdf',segment_id:2};
 const service={request:async(r:Record<string,unknown>)=>({text:r.segment===2?'relevant evidence':'ordinary text'})};
 const ranked=await rerankLocally({...config,index:root,models:join(root,'models')},service as never,'topic',{hits:[a,b],strong:2,meaning:true},new AbortController().signal);
 assert.equal(ranked.hits[0].path,b.path);assert.equal(ranked.rankingNotice,undefined);
});

test('content evidence retains document opening context for a later matching passage',async(t)=>{
 const root=mkdtempSync(join(tmpdir(),'lens-document-context-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'models','reranker'),{recursive:true});writeFileSync(join(root,'models','reranker','enabled.json'),'{}');
 const a={path:'/a.pdf',kind:'pdf',segment:'page',segment_id:1,loc:9,modified:1,size:1,score:1,info:{}};
 const b={...a,path:'/b.pdf',segment_id:2};
 const service={request:async(r:Record<string,unknown>)=>({text:'an otherwise ambiguous later page',context:r.segment===2?'relevant evidence in the document opening':'ordinary opening'})};
 const ranked=await rerankLocally({...config,index:root,models:join(root,'models')},service as never,'topic',{hits:[a,b],strong:2,meaning:true},new AbortController().signal);
 assert.equal(ranked.hits[0].path,b.path);assert.equal(ranked.rankingNotice,undefined);
});

test('uninspected files do not borrow average positive evidence and jump over a verified matching document',()=>{
 const base={kind:'doc',segment:'chunk',segment_id:1,modified:1,size:1,info:{}};
 const doc={...base,path:'/exam.pdf',score:.95},other={...base,path:'/code.ts',score:1},unseen={...base,path:'/uninspected.mp4',kind:'video',score:.9};
 const result={hits:[other,doc,unseen],strong:3,meaning:true};
 const ranked=fuseRelevance(result,[other,doc],{r0:.1,r1:.42});
 assert.equal(ranked[0].hit,doc);assert.ok(ranked.findIndex(r=>r.hit===unseen)>ranked.findIndex(r=>r.hit===doc));
});

 test('small uncertain content-score differences do not erase independent retrieval evidence',()=>{
  const base={kind:'pdf',segment:'page',segment_id:1,modified:1,size:1,info:{}};
  const target={...base,path:'/actual-artifact.pdf',score:.984},related={...base,path:'/related-context.pdf',score:.953},first={...base,path:'/incidental-words.pdf',score:1};
  const result={hits:[first,target,related],strong:3,meaning:true};
  const ranked=fuseRelevance(result,[first,target,related],{r0:.325,r1:.438,r2:.460});
  assert.equal(ranked[0].hit,target);
  assert.equal(fuseRelevance(result,[first,target,related],{r0:.1,r1:.1,r2:.9})[0].hit,related,'clear content evidence can still overturn retrieval');
 });

test('one worker combines subject and full-query evidence without changing unselected visual scores',async()=>{
 const candidates=[{id:'r0',text:'relevant context'}, {id:'r1',text:'relevant actual subject'}, {id:'r2',text:'relevant image',image:'/picture.png'}];
 const full=await scoreLocally(config,'topic',candidates,new AbortController().signal);
 const scores=await scoreLocally(config,'topic',candidates,new AbortController().signal,{query:'subject',groups:[['r0'],['r1']]});
 assert.equal(scores.r1,full.r1);assert.ok(scores.r0<full.r0);assert.equal(scores.r2,full.r2);
 const fallback=await scoreLocally(config,'topic',candidates,new AbortController().signal,{query:'invalid',groups:[['r0'],['r1']]});
 assert.deepEqual(fallback,full,'an invalid optional judgment cannot discard verified full-query scores');
 const stopped=await scoreLocally(config,'topic',candidates,new AbortController().signal,{query:'fail-subject',groups:[['r0'],['r1']]});
 assert.deepEqual(stopped,full,'a failed optional pass preserves verified full-query scores');
 const abort=new AbortController();const pending=scoreLocally(config,'topic',candidates,abort.signal,{query:'wait',groups:[['r0'],['r1']]});setTimeout(()=>abort.abort(),100);
 await assert.rejects(pending,/abort/i,'cancellation must discard even a completed first pass');
});

test('subject ranking is document-only and changing the subject invalidates cached evidence',async(t)=>{
 const root=mkdtempSync(join(tmpdir(),'lens-subject-evidence-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'models','reranker'),{recursive:true});writeFileSync(join(root,'models','reranker','enabled.json'),'{}');
 const local={...config,index:root,models:join(root,'models')};
 const a={path:'/a.md',kind:'doc',segment:'chunk',segment_id:1,modified:1,size:1,score:1,info:{}},b={...a,path:'/b.md',segment_id:2};
 const image={...a,path:'/image.png',kind:'image',segment:'image',segment_id:3};
 let reads=0;const service={request:async(r:Record<string,unknown>)=>{reads++;return r.op==='render'?{image:'/image.png'}:{text:r.segment===2?'relevant actual subject':'relevant context'};}};
 const plan={semantic:'topic',subject:'subject',complete:true,uncertain:false};
 const result={hits:[a,b,image],strong:3,meaning:true,plan};
 const ranked=await rerankLocally(local,service as never,'topic',result,new AbortController().signal);
 assert.ok(ranked.hits.indexOf(ranked.hits.find(h=>h.path==='/b.md')!)<ranked.hits.indexOf(ranked.hits.find(h=>h.path==='/a.md')!));
 assert.equal(ranked.hits[0].path,'/b.md','subject evidence promotes the actual artifact without removing full-query relevance');
 const old=reads;
 await rerankLocally(local,service as never,'topic',{...result,plan:{...plan,subject:'other subject'}},new AbortController().signal);
 assert.ok(reads>old,'subject changes require a fresh judgment');
});

test('a clear full-query winner skips an optional subject request in the same worker',async()=>{
 const candidates=[{id:'r0',text:'relevant evidence'}, {id:'r1',text:'ordinary text'}];
 const scores=await scoreLocally(config,'topic',candidates,new AbortController().signal,{query:'fail-subject',groups:[['r0'],['r1']]});
 assert.deepEqual(scores,{r0:.95,r1:.05},'the worker would fail if a second request were unnecessarily sent');
});


test('a clean install reports missing optional ranking without downloading or reading file contents', async t => {
 const root=mkdtempSync(join(tmpdir(),'lens-unprepared-ranking-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const a={path:'/a.md',kind:'doc',segment:'chunk',segment_id:1,modified:1,size:1,score:1,info:{}};
 const result={hits:[a,{...a,path:'/b.md',segment_id:2}],strong:2,meaning:true};
 const ranked=await rerankLocally({...config,models:root},{request:()=>{throw new Error('must not read');}} as never,'topic',result,new AbortController().signal);
 assert.equal(ranked.rankingNotice,'Local ranking not set up');assert.deepEqual(ranked.hits,result.hits);
});
