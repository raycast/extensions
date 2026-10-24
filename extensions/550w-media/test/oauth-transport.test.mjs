import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from '../src/transport.mjs';
const auth={mode:'oauth',region:'cn',session:{accessToken:async()=> 'fixture-token'}};
test('image and video upload use HTTP multipart without API Key fields',async()=>{
  for(const [endpoint,name] of [['removeImageWatermark','image.png'],['eraseVideo','video.mp4']]) {
    await request(endpoint,auth,{operationId:'fixture-operation'},new File(['test'],name),async(url,options)=>{
      assert.equal(url,'https://www.550wai.cn/media-api/cn/v1/media');assert.equal(options.headers.Authorization,'Bearer fixture-token');assert.equal(options.body.has('apiKey'),false);assert.equal(options.body.get('file').name,name);if(endpoint==='eraseVideo')assert.equal(options.body.get('area'),'0,0,0,0');return Response.json({code:200,status:'accepted',taskId:'task'});
    });
  }
});
test('share uses JSON, queries and recovery use GET, never upload endpoints',async()=>{
  await request('removeVideoWatermark',auth,{operationId:'fixture-operation',videoUrl:'https://v.douyin.com/example/'},undefined,async(url,options)=>{assert.equal(options.headers['Content-Type'],'application/json');assert.equal(JSON.parse(options.body).mediaType,'share');return Response.json({code:200});});
  for(const endpoint of ['receipt','taskDetail','imageWatermarkTaskDetail']) await request(endpoint,auth,{taskId:'task',operationId:'fixture-operation'},undefined,async(url,options)=>{assert.equal(options.method,'GET');assert.equal(options.body,undefined);return Response.json({code:200});});
});
test('invalid files/coordinates reject before request; unknown outcomes never repeat',async()=>{
  let calls=0;const fetcher=async()=>{calls++;throw new Error('secret token');};
  await assert.rejects(request('eraseVideo',auth,{operationId:'fixture-operation',area:'2,2,1,1'},new File(['x'],'a.mp4'),fetcher),/region/);assert.equal(calls,0);
  await assert.rejects(request('eraseVideo',auth,{operationId:'fixture-operation'},new File(['x'],'a.mp4'),fetcher),/Outcome not confirmed/);assert.equal(calls,1);
});
