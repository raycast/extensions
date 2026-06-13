.DEFAULT_GOAL := help

.PHONY: help install local dev test test-watch lint lint-fix typecheck build check

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "JSON Toolkit commands:\n\n"} /^[a-zA-Z_-]+:.*## / {printf "  %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install Node.js dependencies
	npm install

local: dev ## Install and run the extension in local Raycast development mode

dev: ## Install and run the extension in local Raycast development mode
	npm run dev

test: ## Run the test suite
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

lint: ## Run official Raycast lint checks
	npm run lint

lint-fix: ## Automatically fix lint and formatting issues
	npm run fix-lint

typecheck: ## Run TypeScript type checking
	npm run typecheck

build: ## Build the Raycast extension
	npm run build

check: lint typecheck test build ## Run all project checks
