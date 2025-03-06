# OTP Manager for Raycast

This Raycast plugin allows you to manage your two-factor authentication (2FA) codes directly from Raycast, similar to applications like Authy or Google Authenticator.

## Features

- Generate OTP codes (TOTP - Time-based One-Time Password) based on the RFC 6238 standard
- Import codes from a JSON file containing OTP URLs
- Add codes manually with all configuration options
- Clean and minimalist interface integrated with Raycast
- Local storage of OTP configurations for maximum security

## Installation

1. Make sure you have Raycast installed (available at [raycast.com](https://raycast.com))
2. Clone this repository
3. Install dependencies: `npm install`
4. Link the extension with Raycast: `npm run dev`

## Usage

### View OTP codes

Use the `View OTP/2FA Codes` command to display all your authentication codes.

### Import OTP codes from JSON

1. Use the `Import OTP/2FA Codes` command in Raycast
2. Select a JSON file containing an array of OTP URLs

### Add OTP codes manually

1. Use the `Add OTP/2FA Code` command in Raycast
2. Fill out the form with the service details

## OTP URL Format

The URLs follow the standard format: `otpauth://totp/NAME?secret=SECRET&algorithm=ALGORITHM&digits=DIGITS&period=PERIOD&issuer=PROVIDER`
