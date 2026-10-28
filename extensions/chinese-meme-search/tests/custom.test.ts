import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customUrl, parseCustom, readConfig, searchCustom } from '../src/custom-source.ts';
const config = {url:'https://example.com?q={query}&page={page}',results:'data.items',image:'url',title:'name',hasMore:'data.more'};
test('配置编码、嵌套字段、翻页与最后一页',()=>{
 assert.equal(new URL(customUrl(config,'大胆 & ?',2)).searchParams.get('q'),'大胆 & ?');
 const p=parseCustom({data:{items:[{url:'https://example.com/a.gif',name:'大胆'}],more:true}},config,'大胆',1);
 assert.equal(p.items[0].title,'大胆');assert.equal(p.next,customUrl(config,'大胆',2));
 assert.equal(parseCustom({data:{items:[],more:true}},config,'大胆',2).next,undefined);
 assert.throws(()=>readConfig('{}'));
 assert.throws(()=>parseCustom({data:{items:[{url:'file:///tmp/a'}]}},config,'x',1));
});
test('根数组、字符串图片与错误响应', async(t)=>{
 const c={url:'https://example.com?q={query}',results:'',image:''};
 assert.equal(parseCustom(['https://example.com/a.gif'],c,'x',1).items.length,1);
 t.mock.method(globalThis,'fetch',async()=>new Response('bad',{status:429}));
 await assert.rejects(searchCustom(JSON.stringify(c),'x',1),/429/);
});
