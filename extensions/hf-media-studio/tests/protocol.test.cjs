const {test}=require('node:test');const assert=require('node:assert/strict');const {parseEvent,fileURL}=require('../src/protocol.js');
test('complete SSE payload',()=>assert.deepEqual(parseEvent('event: complete\ndata: [{"url":"/gradio_api/file=x.png"}]'),{event:'complete',data:[{url:'/gradio_api/file=x.png'}]}));
test('heartbeat and error',()=>{assert.equal(parseEvent('event: heartbeat\ndata: null').event,'heartbeat');assert.equal(parseEvent('event: error\ndata: quota exhausted').data,'quota exhausted')});
test('same origin file URL',()=>assert.equal(fileURL({url:'/gradio_api/file=x.png'},'https://example.hf.space'),'https://example.hf.space/gradio_api/file=x.png'));
test('reject untrusted URL',()=>{for(const url of ['https://evil.example/x','http://example.hf.space/a','https://example.hf.space.evil.example/x'])assert.throws(()=>fileURL({url},'https://example.hf.space'))});
const {mediaType,imageArgs,audioArgs,redact,publicImageURL}=require('../src/protocol');
test('FLUX args preserve dimensions and seed',()=>assert.deepEqual(imageArgs('flux','cat','576x1024','12'),['cat',12,false,576,1024,4]));
test('Z-Image args use height before width',()=>assert.deepEqual(imageArgs('zimage','cat','576x1024',''),['cat',1024,576,9,0,true]));
test('reject bad model, size, seed and prompt',()=>{assert.throws(()=>imageArgs('bad','cat','512x512','0'));assert.throws(()=>imageArgs('flux','cat','1x1','0'));assert.throws(()=>imageArgs('flux','cat','512x512','-1'));assert.throws(()=>imageArgs('flux',' ','512x512','0'));});
test('audio variants and order',()=>{assert.deepEqual(audioArgs('small-sfx','rain',5),['small-sfx','rain',5,8,1,'pingpong',0]);assert.throws(()=>audioArgs('bad','rain',5));assert.throws(()=>audioArgs('medium','rain',500));});
test('media signatures',()=>{assert.equal(mediaType(Buffer.from([137,80,78,71,13,10,26,10])),'png');assert.equal(mediaType(Buffer.from('RIFF0000WAVE')),'wav');assert.equal(mediaType(Buffer.from('<html>')),'');});
test('token redaction',()=>assert.equal(redact('error hf_secret123-abc'),'error [redacted]'));
test('public URL validation',()=>{assert.equal(publicImageURL('https://example.com/image.png'),'https://example.com/image.png');for(const u of ['http://example.com','https://localhost','https://127.0.0.1','https://foo.local','https://user:pass@example.com','https://example.com:8080'])assert.throws(()=>publicImageURL(u));});

const {spaceError}=require('../src/protocol');
test('null failure does not invent cause',()=>assert.match(spaceError(null),/without an error message/));
test('explicit quota message distinguished',()=>assert.match(spaceError({error:'GPU quota exhausted'}),/Quota or rate limit/));
test('upstream credentials redacted',()=>assert.ok(!spaceError({error:'bad hf_secret123'}).includes('hf_secret123')));
