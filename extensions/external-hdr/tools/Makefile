CC := clang
OBJCFLAGS := -fobjc-arc -O2 -Wall
ARCHS := -arch arm64 -arch x86_64
FRAMEWORK_FLAGS := -framework Foundation -framework CoreGraphics -F/System/Library/PrivateFrameworks -framework MonitorPanel

BINARY := tools/hdrctl
ASSET := assets/hdrctl
INSTALL_DIR := $(HOME)/.local/bin

.PHONY: all install clean

all: $(BINARY) $(ASSET)

$(BINARY): tools/hdrctl.m
	$(CC) $(OBJCFLAGS) $(ARCHS) $(FRAMEWORK_FLAGS) tools/hdrctl.m -o $(BINARY)
	codesign --force --sign - $(BINARY)

$(ASSET): $(BINARY)
	mkdir -p assets
	cp $(BINARY) $(ASSET)
	codesign --force --sign - $(ASSET)

install: $(BINARY)
	mkdir -p $(INSTALL_DIR)
	install -m 755 $(BINARY) $(INSTALL_DIR)/hdrctl

clean:
	rm -f $(BINARY) $(ASSET)
