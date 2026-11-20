#ifndef HDRCORE_H
#define HDRCORE_H

/// JSON array of connected displays: [{id,name,uuid,builtin,hdrCapable,hdr}].
/// Caller owns the returned string and must release it with hdr_free.
char *hdr_list_json(void);

/// Sets HDR for one display. value: 0 = off, 1 = on, 2 = toggle.
/// Returns the final state (0 or 1), or -1 on failure.
int hdr_set(int display_id, int value);

/// Releases a string returned by hdr_list_json.
void hdr_free(char *value);

#endif
