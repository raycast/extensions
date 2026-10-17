import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {regions,regionalManifest} from '../regions.mjs';
const base=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));
test('regions have independent identity and fixed language, no UI region switch',()=>{
  for(const region of ['cn','global']) {
    const manifest=regionalManifest(base,region);
    assert.equal(manifest.version,'3.1.5');assert.equal(manifest.name,regions[region].name);
    assert.equal(manifest.title,regions[region].title);
    assert.equal(manifest.preferences.some(p=>p.name==='region'),false);
    assert.equal(manifest.preferences.find(p=>p.name==='apiKey').description.includes(regions[region].key),true);
  }
  assert.notEqual(regions.cn.name,regions.global.name);
  assert.equal(/[\u4e00-\u9fff]/.test(JSON.stringify(regionalManifest(base,'global'))),false);
});
test('unknown region is rejected; channel does not claim publication readiness',()=>{
  assert.throws(()=>regionalManifest(base,'other'));
  assert.equal(regions.cn.channel,'self-distribution-candidate');
  assert.equal(regions.global.channel,'raycast-store-candidate');
});
