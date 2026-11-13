SWIFTC := xcrun swiftc
BUILD := .build
SOURCES := $(wildcard Sources/*.swift)

.PHONY: build test verify

build: $(BUILD)/snap-and-grab

$(BUILD)/snap-and-grab: $(SOURCES)
	@mkdir -p $(BUILD)
	$(SWIFTC) -O -framework AppKit $(SOURCES) -o $@

$(BUILD)/test-batch: Sources/BatchSession.swift tests/batch/main.swift
	@mkdir -p $(BUILD)
	$(SWIFTC) $^ -o $@

$(BUILD)/test-history: Sources/ScreenshotHistory.swift tests/history/main.swift
	@mkdir -p $(BUILD)
	$(SWIFTC) $^ -o $@

$(BUILD)/test-shortcut: Sources/CaptureShortcut.swift tests/shortcut/main.swift
	@mkdir -p $(BUILD)
	$(SWIFTC) $^ -o $@

$(BUILD)/test-clipboard: Sources/BatchClipboard.swift tests/clipboard/main.swift
	@mkdir -p $(BUILD)
	$(SWIFTC) -framework AppKit $^ -o $@

$(BUILD)/test-hud: Sources/SelectionHUD.swift tests/hud/main.swift
	@mkdir -p $(BUILD)
	$(SWIFTC) -framework AppKit $^ -o $@

test: $(BUILD)/test-batch $(BUILD)/test-history $(BUILD)/test-shortcut $(BUILD)/test-clipboard $(BUILD)/test-hud
	$(BUILD)/test-batch
	$(BUILD)/test-history
	$(BUILD)/test-shortcut
	$(BUILD)/test-clipboard
	$(BUILD)/test-hud

verify: build test
	zsh -n scripts/capture-and-copy.sh
