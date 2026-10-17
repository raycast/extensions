# Pangram AI Detector

A Raycast extension that checks text for AI authorship with the Pangram API, using the user's own API key.

## Language

### Checking

**Check**:
One Pangram analysis of one text with one Model, sent through the API using the user's key. Each new Check spends prepaid credits.
_Avoid_: Scan, detection, run

**Source**:
Where a Check takes its text from: the Selection or the Clipboard.
_Avoid_: Input

**Model**:
The Pangram detection model a Check runs on. "Default" follows Pangram's current model.

**Model Version**:
The numbered release of the Model that produced a result, e.g. 4.0.

**Cached Result**:
A stored result for a Check of the same trimmed text with the same Model, shown at no cost. By default, ignored after a newer Model Version is detected.

**Refresh**:
Running a new Check on the same text, skipping any Cached Result and spending prepaid credits.
_Avoid_: Recheck, rerun

### Results

**Verdict**:
Pangram's overall call for the whole text: AI, Human, or Mixed. The Verdict tag displays AI as "AI-Generated".
_Avoid_: Prediction, classification

**Breakdown**:
The share of the text that is AI-Generated, AI-Assisted, and Human Written. Shown as three colored percentage tags labeled AI, Assisted, and Human.
_Avoid_: Fractions, scores

**Segment**:
One section of the text that Pangram labels separately, with Pangram's confidence in that label.
_Avoid_: Window, chunk

**Humanized**:
A Segment that Pangram flags as AI text passed through a humanizer tool.

**Limited Confidence**:
The extension's warning for text below a configurable word count (200 by default), shown as a "Short text" tag beside the Verdict. Separate from Pangram's per-Segment confidence.
_Avoid_: Low confidence (that is a Segment's own confidence level)
