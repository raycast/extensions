assets/symbols/data.json:
	sh generate.sh
	
assets/symbols/data_beta.json:
	sh generate.sh

.PHONY: build
build: node_modules assets/symbols/data.json assets/symbols/data_beta.json prettierify
	@npm run build
	
.PHONY: clean
clean:
	@rm -rf node_modules && rm -rf assets/symbols/*.json && rm -rf assets/symbols/images/* && rm -rf SFSymbolsSearch.playground/Resources/*
	
node_modules:
	@npm install

.PHONY: prettierify
prettierify: node_modules
	@npx prettier -w src/index.tsx

.PHONY: run
run: node_modules assets/symbols/data.json assets/symbols/data_beta.json prettierify
	@npm run dev