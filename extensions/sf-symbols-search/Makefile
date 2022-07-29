.PHONY: build
build: node_modules symbols.json prettierify
	@npm run build

node_modules:
	@npm install

.PHONY: prettierify
prettierify: node_modules
	@npx prettier -w src/index.tsx

.PHONY: run
run: node_modules symbols.json prettierify
	@npm run dev

symbols.json:
	@swift SFSymbolsSearch.playground/Contents.swift > assets/symbols.json