import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePage, searchPage, searchUrl, downloadImage } from "../src/source.ts";
const image = { indexUrl: "https://biaoqing.gtimg.com/product/1/o/test.gif" };
const response = (data: unknown[], hasMore = 0) => ({ code: 0, data, hasMore, endFlag: false });

test("关键词编码与分页；图片去重且保留原图格式", () => {
  const url = searchUrl(" 大胆/? ");
  assert.equal(new URL(url).searchParams.get("key"), "大胆/?");
  const result = parsePage(response([image, image], 1), url);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].url, image.indexUrl);
  assert.equal(new URL(result.next!).searchParams.get("page"), "2");
});
test("不足20张仍按服务端 hasMore 翻页；endFlag 和空结果终止分页", () => {
  const url = searchUrl("开心");
  assert.ok(parsePage(response([image], 1), url).next);
  assert.equal(parsePage({ ...response([image], 1), endFlag: true }, url).next, undefined);
  assert.equal(parsePage(response([], 1), url).next, undefined);
});
test("接口错误和损坏结果不能显示为空结果", () => {
  const url = searchUrl("大胆");
  assert.throws(() => parsePage({ code: 5, msg: "限流" }, url), /限流/);
  assert.throws(() => parsePage({ code: 0 }, url), /结果列表/);
  assert.throws(() => parsePage(response([{}]), url), /无效图片/);
  assert.throws(() => parsePage(response([{ indexUrl: "https://other.example/a.gif" }]), url), /未知图片/);
});
test("请求使用传入的关键词 URL，报告429，拒绝非图片下载", async (t) => {
  let requested = "";
  const mock = t.mock.method(globalThis, "fetch", async (url: string) => {
    requested = url;
    return new Response(JSON.stringify(response([image])), { headers: { "content-type": "application/json" } });
  });
  assert.equal((await searchPage(searchUrl("大胆"))).items.length, 1);
  assert.equal(requested, searchUrl("大胆"));
  mock.mock.mockImplementation(async () => new Response("", { status: 429 }));
  await assert.rejects(searchPage(searchUrl("大胆")), /429/);
  mock.mock.mockImplementation(async () => new Response("<html>error</html>", { headers: { "content-type": "text/html" } }));
  await assert.rejects(downloadImage(image.indexUrl), /非图片/);
});
