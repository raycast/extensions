import test from 'node:test';
import assert from 'node:assert/strict';
import {resultSummary} from '../src/result-summary.mjs';
import {taskQuery} from '../src/task-query.mjs';
test('HTTP image admission preserves top-level task ID and waiting status',()=>{
  const result={code:200,status:'accepted',kind:'image',taskId:'task'};
  assert.equal(resultSummary('image',result).status,'waiting');assert.equal(resultSummary('image',result).taskId,'task');assert.equal(taskQuery('image',result).taskId,'task');
});
test('recovered share receipt exposes only validated completed download URL',()=>{
  assert.equal(resultSummary('receipt_query',{code:200,status:'success',data:{video:'https://cdn.example.com/result.mp4'}}).url,'https://cdn.example.com/result.mp4');
  assert.equal(resultSummary('receipt_query',{code:200,status:'preparing',data:{video:'https://cdn.example.com/result.mp4'}}).url,undefined);
});
