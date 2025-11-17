.PHONY: setup install-ccusage install-deps build link open

setup: install-ccusage install-deps build link open
	@echo "ccost is ready! Use it in Raycast."

install-ccusage:
	@echo "Installing ccusage globally."
	@npm install -g ccusage@latest
	@echo "ccusage installed. Run 'ccusage login' to authenticate."

install-deps:
	@echo "Installing dependencies."
	@npm install

build:
	@echo "Building extension."
	@npx ray build

link:
	@echo "Linking extension to Raycast."
	@npx ray develop

open:
	@echo "Opening Raycast."
	@open -a Raycast
