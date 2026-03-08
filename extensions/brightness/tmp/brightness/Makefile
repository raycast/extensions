#!/usr/bin/env make -f
# Makefile to build brightness
# originally by Jon Stacey <jon@jonsview.com>

prefix=/usr/local

CFLAGS_X86_64 = $(CFLAGS) -target x86_64-apple-macos10.8
CFLAGS_ARM64 = $(CFLAGS) -target arm64-apple-macos11

override LDFLAGS += -framework IOKit \
	-framework ApplicationServices \
	-framework CoreDisplay \
	-F /System/Library/PrivateFrameworks \
	-framework DisplayServices \
	-Wl,-U,_CoreDisplay_Display_SetUserBrightness \
	-Wl,-U,_CoreDisplay_Display_GetUserBrightness \
	-Wl,-U,_DisplayServicesCanChangeBrightness \
	-Wl,-U,_DisplayServicesBrightnessChanged \
	-Wl,-U,_DisplayServicesGetBrightness \
	-Wl,-U,_DisplayServicesSetBrightness \

all: build

build: brightness

brightness: brightness.x86_64 brightness.arm64
	/usr/bin/lipo -create -output $@ $^

brightness.x86_64: brightness.x86_64.o
	$(CC) $(CFLAGS_X86_64) $(LDFLAGS) $^ -o $@

brightness.arm64: brightness.arm64.o
	$(CC) $(CFLAGS_ARM64) $(LDFLAGS) $^ -o $@

%.x86_64.o: %.c
	$(CC) $(CPPFLAGS) $(CFLAGS_X86_64) $< -c -o $@

%.arm64.o: %.c
	$(CC) $(CPPFLAGS) $(CFLAGS_ARM64) $< -c -o $@

clean:
	/bin/rm -f brightness brightness.x86_64 brightness.arm64 *.o

install:
	/bin/mkdir -p $(prefix)/bin
	/usr/bin/install -s -m 0755 brightness $(prefix)/bin
