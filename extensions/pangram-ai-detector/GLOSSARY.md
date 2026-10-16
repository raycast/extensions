# Pangram AI Detector

A Raycast extension that checks text for AI authorship with the Pangram API, using the user's own API key.

## Language

### Checking

**Check**:
One Pangram analysis of one text with one Model. It spends the user's credits.
_Avoid_: Scan, detection, run

**Source**:
Where a Check takes its text from: the Selection or the Clipboard.
_Avoid_: Input

**Model**:
The Pangram detection model a Check runs on. "Default" follows Pangram's current model.

**Model Version**:
The numbered release of the Model that produced a result, e.g. 4.0.

**Cached Result**:
A stored result for a Check of the same trimmed text with the same Model, shown instead of spending credits again.

**Refresh**:
Running a new Check on the same text, skipping any Cached Result.
_Avoid_: Recheck, rerun

### Results

**Verdict**:
Pangram's overall call for the whole text: AI, Human, or Mixed.
_Avoid_: Prediction, classification

**Breakdown**:
The share of the text that is AI-Generated, AI-Assisted, and Human Written.
_Avoid_: Fractions, scores

**Segment**:
One section of the text that Pangram labels separately.
_Avoid_: Window, chunk

**Humanized**:
A Segment that Pangram flags as AI text passed through a humanizer tool.

**Limited Confidence**:
A result on a text too short for Pangram to judge reliably.
_Avoid_: Low confidence (that is a Segment's own confidence level)
