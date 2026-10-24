import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, stat, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { bundleId, compareVersions, findApp, minimumVersion, openInApp, validatePaths, writeTextPair } from '../src/core.ts';

async function fixture(t) {
 const dir = await mkdtemp(join(tmpdir(), 'raycast-test-'));
 t.after(() => rm(dir, {recursive:true,force:true}));
 const pair = [join(dir,'a $(touch injected).txt'),join(dir,'--help.txt')];
 await Promise.all(pair.map(p=>writeFile(p,'one\n')));
 return {dir,pair};
}
async function fakeApp(dir, name, version) {
 const path = join(dir, `${name}.app`);
 await mkdir(join(path,'Contents'),{recursive:true});
 await writeFile(join(path,'Contents','Info.plist'),`<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>CFBundleShortVersionString</key><string>${version}</string></dict></plist>`);
 return path;
}
test('paths with shell syntax and option names reach open unchanged, left before right', async t=>{
 const {pair}=await fixture(t);
 const calls=[];
 await openInApp({path:'/Applications/Diff Anything.app',version:'1.6.1'},pair,async (...args)=>{calls.push(args);});
 assert.deepEqual(calls.map(c=>[c[0],c[1]]),[['/usr/bin/open',['-a','/Applications/Diff Anything.app',...pair]]]);
 await assert.rejects(openInApp({path:'/x.app',version:'1.6.1'},pair,async ()=>{throw new Error('boom');}),/could not be opened/);
});
test('nonexistent paths, mixed selections and special files are not accepted', async t=>{
 const {dir,pair}=await fixture(t);
 await assert.rejects(validatePaths([pair[0]]),/exactly two/);
 await assert.rejects(validatePaths([pair[0],dir]),/not one of each/);
 await assert.rejects(validatePaths([pair[0],join(dir,'gone')]),/Cannot read/);
 await assert.rejects(validatePaths(['relative',pair[1]]),/absolute/);
 await assert.rejects(validatePaths(['/dev/null',pair[1]]),/regular files/);
 assert.deepEqual(await validatePaths(pair),pair);
});
test('the newest installed Diff Anything is chosen, and a missing or older app says how to fix it', async t=>{
 const {dir}=await fixture(t);
 const old=await fakeApp(dir,'Old','1.6.0');
 const current=await fakeApp(dir,'Current',minimumVersion);
 const newer=await fakeApp(dir,'Newer','1.10.0');
 await assert.rejects(findApp([{path:current,bundleId:'com.other.app'}]),/not installed.*Mac App Store/);
 await assert.rejects(findApp([{path:old,bundleId}]),/needs Diff Anything 1\.6\.1 or later; 1\.6\.0 is installed.*Mac App Store/);
 assert.deepEqual(await findApp([{path:old,bundleId},{path:newer,bundleId},{path:current,bundleId}]),{path:newer,version:'1.10.0'});
 assert.ok(compareVersions('1.10.0','1.9.9')>0);
 assert.equal(compareVersions('1.6','1.6.0'),0);
});
test('texts become private files, empty text is kept, and only pairs older than a day are removed', async t=>{
 const {dir}=await fixture(t);
 const day=24*60*60*1000, start=Date.UTC(2026,9,7);
 const first=await writeTextPair('', 'right\n', dir, start);
 assert.equal(await readFile(first[0],'utf8'),'');
 assert.equal(await readFile(first[1],'utf8'),'right\n');
 assert.equal((await stat(first[0])).mode&0o777,0o600);
 assert.equal((await stat(join(first[0],'..'))).mode&0o777,0o700);
 const second=await writeTextPair('a','b',dir,start+day/2);
 assert.equal((await readdir(join(dir,'text-comparisons'))).length,2);
 await writeTextPair('c','d',dir,start+day+1);
 const left=await readdir(join(dir,'text-comparisons'));
 assert.equal(left.length,2);
 assert.ok(left.includes(join(second[0],'..').split('/').at(-1)));
});
