assets/symbols/data.json: SFSymbolsSearch.playground/Resources/symbol_glyphs.txt
	@swift SFSymbolsSearch.playground/Contents.swift > assets/symbols/data.json

.PHONY: build
build: node_modules assets/symbols/data.json prettierify
	@npm run build
	
.PHONY: clean
clean:
	@rm -rf node_modules && rm -rf assets/symbols/data.json && rm -rf assets/symbols/images/* && rm -rf SFSymbolsSearch.playground/Resources/*

node_modules:
	@npm install

.PHONY: prettierify
prettierify: node_modules
	@npx prettier -w src/index.tsx

.PHONY: run
run: node_modules assets/symbols/data.json prettierify
	@npm run dev
	
SFSymbolsSearch.playground/Resources/symbol_glyphs.txt:
	@sh generate.sh