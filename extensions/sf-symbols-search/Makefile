node_modules:
	@npm install

.PHONY: build
build: node_modules compile_swift
	@npm run build

.PHONY: run
run: node_modules compile_swift
	@npm run dev

.PHONY: compile_swift
compile_swift:
	@swiftc SFSymbolsSearch.playground/Contents.swift -o assets/sfsymbols && \
		cp SFSymbolsSearch.playground/Resources/symbol_names.txt assets/ && \
		cp SFSymbolsSearch.playground/Resources/symbol_glyphs.txt assets/ && \
		cp SFSymbolsSearch.playground/Resources/symbol_categories.plist assets/
