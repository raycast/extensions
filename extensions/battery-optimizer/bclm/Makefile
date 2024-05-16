prefix ?= /usr/local
bindir = $(prefix)/bin

build:
	swift build -c release --disable-sandbox --arch arm64 --arch x86_64
	strip .build/apple/Products/Release/bclm

install: build
	install ".build/apple/Products/Release/bclm" "$(bindir)"

uninstall:
	rm -rf "$(bindir)/bclm"

test:
	swift build -c debug --build-tests
	sudo swift test --skip-build

clean:
	rm -rf .build

.PHONY: build install uninstall clean
