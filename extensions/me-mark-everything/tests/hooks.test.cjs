const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Deterministic source-level hook scheduling; not a substitute for native UI acceptance.
function hooks() {
  const slots = []; let index = 0;
  return { begin() { index = 0; }, api: {
    useState(initial) { const i=index++; if (!(i in slots)) slots[i]=initial; return [slots[i], value => { slots[i]=typeof value==='function'?value(slots[i]):value; }]; },
    useRef(initial) { const i=index++; if (!(i in slots)) slots[i]={current:initial}; return slots[i]; },
    useCallback(fn) { return fn; }, useEffect() {},
  } };
}
function load(file, mocks) {
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS} }).outputText;
  const module={exports:{}};
  vm.runInNewContext(code, {module,exports:module.exports,require:name=>{if(!(name in mocks)) throw Error(name);return mocks[name];},AbortController,console,Error});
  return module.exports;
}
test('same-query failure marks retained rows; changed-query failure clears unrelated rows', async () => {
  const h=hooks(); let fail=false, libraryId='one', code;
  const {useBookmarks}=load('src/hooks/useBookmarks.ts', {react:h.api,
    '../helper':{queryAll:async()=>{if(fail) throw Object.assign(Error('unavailable'), {code});return{items:[{id:'saved'}]};},status:async()=>({}),statusText:()=> 'Synced'},
    '../helpers/me':{collectionQuery:()=>({}),toBookmark:row=>({_id:row.id})}, '../session':{session:async()=>({libraryId})}});
  const render=(search='old')=>{h.begin();return useBookmarks({collection:'0',search});};
  await render().revalidate(); fail=true;
  await assert.rejects(render().revalidate());
  assert.equal(render().data.items.length,1); assert.match(render().state,/Refresh failed/); assert.equal(render().error,'unavailable');
  assert.equal(render('new').data.items.length,0); await assert.rejects(render('new').revalidate()); assert.equal(render('new').data.items.length,0);
  libraryId='two'; await assert.rejects(render().revalidate()); assert.equal(render().data.items.length,0);
  fail=false; await render().revalidate(); fail=true;code='LIBRARY_MISMATCH';await assert.rejects(render().revalidate());assert.equal(render().data.items.length,0);
});
test('late collection/tag responses cannot replace a newer bound library', async () => {
  for (const kind of ['tag','collection']) {
    const h=hooks(); let resolveOld;
    const old=new Promise(resolve=>{resolveOld=resolve;});
    const {useEntities}=load('src/hooks/useEntities.ts',{react:h.api,'../helper':{queryAll:async s=>s.libraryId==='old'?old:{items:[{id:'new'}]}},'../session':{session:async()=>{throw Error('must use bound session');}}});
    const render=libraryId=>{h.begin();return useEntities(kind,{libraryId});};
    const first=render('old').revalidate(); await Promise.resolve(); await render('new').revalidate();
    resolveOld({items:[{id:'old'}]});await first;
    assert.equal(render('new').libraryId,'new'); assert.equal(render('new').entities[0].id,'new');
    assert.equal(render('third').entities,undefined);
  }
});
