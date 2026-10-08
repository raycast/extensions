# SEO Lighthouse

Lighthouse SEO Analyzer is a powerful Raycast extension that leverages Google Lighthouse to provide comprehensive SEO and performance audits for any website. Simply input a URL and choose your desired analysis mode, device type, and categories. Get detailed insights into page load speed, core web vitals, accessibility, best practices, and more.

## Features

- **Comprehensive Audits**: Performance, Accessibility, Best Practices, and SEO categories
- **Core Web Vitals**: LCP, FCP, CLS, TTFB, Speed Index, and more
- **Device Modes**: Mobile and Desktop emulation
- **Scorecard Dashboard**: SVG gauges for category scores and Core Web Vitals
- **Share Scorecard**: Copy or save the dashboard as a PNG (macOS)
- **AI Insights**: Ask AI for a quick executive summary and concrete fixes
- **Detailed Field Guide**: Per-audit descriptions with pass/warn/fail status
- **Priority Opportunities**: High-ROI improvements with estimated savings
- **Email Draft**: Generate a Mail draft with report highlights (macOS)
- **Caching**: 24-hour cache in the extension support folder (not the Output Path)
- **AI Tool**: Exposed as a Raycast AI tool for programmatic website audits

## Installation

This extension requires the Lighthouse CLI to be installed globally:

```bash
npm install -g lighthouse
```

Lighthouse also requires a Chromium-based browser (Chrome, Edge, Brave, etc.) installed on your system.

## Usage

1. Open Raycast and search for "SEO Lighthouse"
2. Enter the URL you want to audit
3. Select device mode (Mobile/Desktop) and categories
4. Optionally use **Choose Output Directory** to pick where JSON reports are saved
5. Press Enter to run the audit
6. View the report with scores, metrics, and opportunities
7. Use `Cmd+Shift+C` to copy the scorecard image, `Cmd+I` for AI insights, `Cmd+D` for detailed field descriptions

JSON reports are saved to the Output Path as `lighthouse-<host>-<timestamp>.json` and are not deleted. A 24-hour cache is stored separately in the extension support folder so re-running the same URL/device/categories is fast without wiping yesterday's report.

## Preferences

| Preference      | Description                                                                | Default       |
| --------------- | -------------------------------------------------------------------------- | ------------- |
| Report Profile  | Prioritize dashboard metrics (General, Marketing, SEO, Development)        | General       |
| Output Path     | Directory for readable JSON reports (`lighthouse-<host>-<timestamp>.json`) | `~/Downloads` |
| Lighthouse Path | Custom path to the Lighthouse CLI (optional; not a Chrome/Chromium binary) | Auto-detected |
