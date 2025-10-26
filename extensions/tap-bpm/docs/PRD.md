# PRD: BPM Counter Raycast Extension

### Product Overview

A simple, keyboard-driven BPM (beats per minute) counter extension for Raycast that allows users to tap a key repeatedly to calculate the tempo of music or any rhythmic pattern.
User Story
As a musician/DJ/music enthusiast, I want to quickly measure the BPM of a song by tapping along with the beat, so I can know the tempo without external tools.
Core Features

Tap Input: User taps a key (like Space or Enter) in rhythm with the music
Real-time BPM Calculation: Display the current BPM as user taps
Tap History: Show the last 5-10 taps to provide context
Reset Function: Clear taps and start over
Average BPM Display: Show a running average for accuracy

User Interface

Main view displays:

- Large, prominent BPM number
- Instruction text ("Press Space to tap")
- Instruction text ("BPM Value copied to clipboard after no input for 5 sec)

## STRETCH GOALS

- Window flashes on tap and/or when clock moving forward @ BPM speed
- Actions:
  - Reset (could this be a hotkey? CMD + R / CMD + SPACE)
  - Copy BPM value button
- Menu Bar

### Success Metrics

Accurate BPM calculation (within ±.5 BPM of actual tempo)
Responsive UI (taps register immediately)
Simple, intuitive workflow
