#!/usr/bin/env node
import {createInterface} from 'node:readline';
for await (const input of createInterface({input:process.stdin})) {
 const request=JSON.parse(input);
 if (request.query==='wait') await new Promise(resolve => setTimeout(resolve,30000));
 else if (request.query==='fail-subject') process.exit(1);
 else if (request.query==='invalid') console.log(JSON.stringify({scores:{foreign:1}}));
 else console.log(JSON.stringify({scores:Object.fromEntries(request.candidates.map(c=>[c.id,request.query==='subject'?(c.text.includes('actual subject')?0.95:0.05):c.text.includes('relevant')?0.95:0.05]))}));
}
