# UBS Summary

status: advisory-findings
exit_code: 1
parseable: yes
scanned_source_files: 14
skipped: tests=9 generated=0 unsupported=0 missing=0
severity_totals: critical=6 warning=3 info=342 good=0
note: UBS findings are advisory; they do not seal-block this patch.

## Actionable Source Findings

- warning source scan [js] fetch() without AbortSignal cancellation: Pass a signal from AbortSignal.timeout() or an AbortController so callers can bound stalled requests
- critical source scan [js] Secret, signature, or token compared with ==/!=: Use crypto.timingSafeEqual(), WebCrypto verify(), or a reviewed constant-time helper for bearer tokens, HMACs, CSRF values, and reset secrets (6 occurrences)
- warning source scan [js] Switch cases may be missing break: Add break or /* falls through */ (2 occurrences)

## Artifacts

- findings: .workflow/finish-lane/ubs-findings.jsonl
- report: .workflow/finish-lane/ubs-report.json
