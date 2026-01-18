SHELL := /bin/bash

.PHONY: install lint typecheck test ci

install:
	npm ci

lint:
	npm run lint

typecheck:
	npx tsc --noEmit

test:
	npm test

ci: lint typecheck test
