# Receive ID Debug Guide

## Current Error
`send message error: 230001 Your request contains an invalid request parameter, ext=invalid receive_id`

## Solution Steps

### Step 1: Get Your Lark User Information
1. Open Lark app
2. Click your avatar (top right)
3. Click "Profile" or "个人资料"
4. Look for:
   - User ID (starts with `ou_`)
   - Open ID (starts with `ou_` or similar)
   - Email (must match exactly)

### Step 2: Try Different Receive ID Types

#### Option A: Open ID (Recommended)
```
Receive ID Type: open_id
Receive ID: ou_xxxxxxxxxxxxxxxxx
```

#### Option B: Email (Exact Match Required)
```
Receive ID Type: email  
Receive ID: your.exact.lark.login@domain.com
```

#### Option C: Chat ID (Most Reliable)
```
Receive ID Type: chat_id
Receive ID: oc_xxxxxxxxxxxxxxxxx
```

### Step 3: Test Message
Send test: "Hello from Raycast!"

## Troubleshooting
- If email fails → try open_id
- If open_id fails → try chat_id
- Always use exact values from Lark profile