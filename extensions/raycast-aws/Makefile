.PHONY: install check-deps build dev lint lint-fix clean

# Minimum npm major version this extension's tooling (ray CLI) expects.
NPM_MIN_MAJOR := 7

install: check-deps ## Install dependencies and produce a production build
	npm install
	npx ray build

check-deps: ## Verify node/npm (and therefore npx) are available before running anything
	@command -v node >/dev/null 2>&1 || { \
		echo "Error: node is not installed."; \
		echo "Install it first, e.g.: brew install node"; \
		exit 1; \
	}
	@command -v npm >/dev/null 2>&1 || { \
		echo "Error: npm is not installed (it ships with Node.js)."; \
		echo "Reinstall Node.js, e.g.: brew install node"; \
		exit 1; \
	}
	@npm_major=$$(npm -v | cut -d. -f1); \
	if [ "$$npm_major" -lt "$(NPM_MIN_MAJOR)" ]; then \
		echo "Error: npm $$(npm -v) is too old (need >= $(NPM_MIN_MAJOR).x, which ships with npx)."; \
		echo "Update it, e.g.: brew upgrade node"; \
		exit 1; \
	fi
	@echo "node: $$(node -v)"
	@echo "npm:  $$(npm -v)"

build: check-deps ## Compile the extension
	npx ray build

dev: check-deps ## Hot-reload the extension into Raycast for local testing
	npx ray develop

lint: check-deps ## Lint the extension (manifest, ESLint, Prettier)
	npx ray lint

lint-fix: check-deps ## Lint and auto-fix formatting issues
	npx ray lint --fix

clean: ## Remove installed dependencies
	rm -rf node_modules
