import test from "node:test";
import assert from "node:assert/strict";
import { parseOpencodegoHtml } from "./parser.js";

// Sample Solid.js hydration HTML from OpenCode Go
test("parseOpencodegoHtml extracts usage from Solid.js hydration", () => {
  const html = `<!DOCTYPE html>
<html><body>
<script>self.$R=self.$R||[];
_$HY.r["billing.get[\\"wrk_FAKE123456789\\"]""]=$R[13]=$R[2]($R[14]={p:0,s:0,f:0});
_$HY.r["lite.subscription.get[\\"wrk_FAKE123456789\\"]""]=$R[17]=$R[2]($R[18]={p:0,s:0,f:0});
($R[24]=(r,d)=>{r.s(d),r.p.s=1,r.p.v=d})($R[18],$R[27]={mine:!0,useBalance:!1,rollingUsage:$R[28]={status:"ok",resetInSec:7302,usagePercent:13},weeklyUsage:$R[29]={status:"ok",resetInSec:406676,usagePercent:32},monthlyUsage:$R[30]={status:"ok",resetInSec:1188832,usagePercent:89}});
$R[24]($R[20],$R[27]);
$R[24]($R[14],$R[31]={customerID:"cus_FAKECUSTOMER123",paymentMethodID:"pm_FAKEPAYMENT123",paymentMethodType:"card",paymentMethodLast4:"4242",balance:123456789,reload:!1,reloadAmount:10,reloadAmountMin:10,reloadTrigger:5,reloadTriggerMin:5,monthlyLimit:50,monthlyUsage:50000000,timeMonthlyUsageUpdated:$R[32]=new Date("2026-01-01T00:00:00.000Z"),reloadError:null,timeReloadError:null,subscription:null,subscriptionID:null,subscriptionPlan:null,timeSubscriptionBooked:null,timeSubscriptionSelected:null,lite:$R[33]={},liteSubscriptionID:"sub_FAKESUBSCRIPTION123"});
$R[24]($R[16],$R[31]);
</script></body></html>`;

  const result = parseOpencodegoHtml(html);

  assert.equal(result.error, null);
  assert.ok(result.usage);
  assert.equal(result.usage.planName, "Go");

  // Should have 2 quotas: Rolling, Weekly
  // (Monthly is primary, not in quotas; Credit removed as it belongs to Zen plan)
  assert.equal(result.usage.quotas.length, 2);

  // Check monthly usage (primary)
  assert.equal(result.usage.primary.label, "Monthly");
  assert.equal(result.usage.primary.used, 89);
  assert.equal(result.usage.primary.limit, 100);

  // Check rolling usage
  const rolling = result.usage.quotas.find((q) => q.label === "Rolling (2h)");
  assert.ok(rolling);
  assert.equal(rolling.used, 13);
});

test("parseOpencodegoHtml returns error for missing data", () => {
  const result = parseOpencodegoHtml("<html><body>No data here</body></html>");
  assert.equal(result.error?.type, "parse_error");
  assert.equal(result.usage, null);
});

test("parseOpencodegoHtml returns error for empty HTML", () => {
  const result = parseOpencodegoHtml("");
  assert.equal(result.error?.type, "parse_error");
});
