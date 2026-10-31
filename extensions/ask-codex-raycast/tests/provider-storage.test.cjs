require('./load.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {storageKeys}=require('../src/session-storage.ts');
const {connectionSignature}=require('../src/setup-state.ts');
test('Codex retains installed storage while other CLI state cannot collide',()=>{
 const codex=storageKeys('codex'), agy=storageKeys('antigravity');
 assert.equal(codex.library,'ask-codex.conversations.v2');
 assert.equal(codex.model,'ask-chatgpt.model-selection.v1');
 for(const key of Object.keys(codex))assert.notEqual(codex[key],agy[key]);
 assert.equal(new Set([...Object.values(codex),...Object.values(agy)]).size,10);
});
test('CLI connection setup changes only for its own executable settings',()=>{
 const base={codexPath:'/codex',agyPath:'/agy'};
 assert.equal(connectionSignature(base),connectionSignature({...base,agyPath:'/other'}));
 assert.notEqual(connectionSignature(base,'antigravity'),connectionSignature({...base,agyPath:'/other'},'antigravity'));
 assert.notEqual(connectionSignature(base),connectionSignature(base,'antigravity'));
});

for (const [provider, key] of [['antigravity','agyPath'],['qoder','qoderPath'],['qoder-cn','qoderCnPath'],['workbuddy','workbuddyPath'],['gemini','geminiPath']]) {
 test(`${provider} connection signature uses its own path and ignores other providers`,()=>{
  const base={};const changed={[key]:'/new/path'};
  assert.notEqual(connectionSignature(base,provider),connectionSignature(changed,provider));
  assert.equal(connectionSignature(base,'codex'),connectionSignature(changed,'codex'));
 });
}
test('all six providers have distinct storage without changing Codex legacy keys',()=>{
 const providers=['codex','antigravity','qoder','qoder-cn','workbuddy','gemini'];
 const keys=providers.flatMap(p=>Object.values(storageKeys(p)));
 assert.equal(new Set(keys).size,30);
});
