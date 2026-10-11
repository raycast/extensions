# Builds the read-only SMC reader as a universal binary into ../assets/.
CFLAGS = -O2 -Wall -arch arm64 -arch x86_64 -mmacosx-version-min=11.0
LDFLAGS = -framework IOKit -framework CoreFoundation

../assets/smc-reader: smc.c
	clang $(CFLAGS) smc.c -o $@ $(LDFLAGS)

clean:
	rm -f ../assets/smc-reader
.PHONY: clean
