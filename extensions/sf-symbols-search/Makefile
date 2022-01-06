node_modules:
	@npm install

.PHONY: build
build: node_modules symbols.json
	@npm run build

.PHONY: run
run: node_modules symbols.json
	@npm run dev

symbols.json:
	@swift SFSymbolsSearch.playground/Contents.swift > assets/symbols.json