# P360 Raycast Extension - 런칭 콘텐츠

Store 승인 후 사용할 런칭 채널별 콘텐츠입니다.

---

## 1. Product Hunt

### Tagline (60자 이내)
```
Know when to make important decisions with your biometric data
```

### Description
```
P360 brings decision support to your Raycast launcher.

The Problem:
You track your HRV, sleep, and readiness with your Oura Ring. But what do you actually DO with that data in the moment?

- Making impulse purchases when tired
- Sending emails you regret when stressed
- Scheduling important meetings at wrong times

The Solution:
One keystroke (⌘ + Space → "p360") tells you if now is a good time for important decisions.

How it works:
🟢 70-100: Great time for negotiations, important emails
🔵 50-69: Good for everyday decisions
🟡 30-49: Consider waiting for big decisions
🔴 0-29: Avoid major commitments, focus on recovery

Built for biohackers and high-performers who want to optimize their decision-making, not just track their sleep.

Privacy-first: Your data stays between you and Oura. Nothing stored on our servers.
```

### First Comment (Maker)
```
Hey PH! 👋

I built this because I kept making bad decisions when tired - impulsive purchases, emails I'd regret, committing to things I shouldn't have.

I already had all the data in my Oura Ring, but I never checked it at the right moment.

P360 puts that data exactly where I need it - one keystroke away in Raycast.

The algorithm is simple (intentionally):
- Primary: Oura Readiness Score
- Fallback: Sleep Score
- Modifier: HRV Balance

Would love your feedback! What other integrations would be useful?
```

---

## 2. Reddit - r/raycast

### Title
```
[Extension] P360 - Check your decision readiness from Oura Ring biometrics
```

### Post
```
Hey r/raycast!

Just published my first Raycast extension - P360 Decision Readiness.

**What it does:**
- Connects to your Oura Ring via OAuth
- Shows your decision readiness score (0-100)
- Gives actionable recommendations

**How to use:**
⌘ + Space → "p360" or "check readiness"

**Why I built it:**
I track everything with my Oura Ring but never checked the data at the right moment. Now I can see if I'm in a good state before sending important emails or making big decisions.

**Score guide:**
- 🟢 70+: Go for it
- 🔵 50-69: Good for routine stuff
- 🟡 30-49: Maybe wait
- 🔴 <30: Recovery mode

Available in the Raycast Store. Would love feedback!
```

---

## 3. Reddit - r/Biohackers

### Title
```
Made a Raycast extension that tells me when to make important decisions based on Oura data
```

### Post
```
Fellow biohackers,

I've been tracking with Oura for 2+ years but realized I was just collecting data without acting on it in real-time.

Built a simple tool that:
1. Pulls my Sleep Score, Readiness, and HRV from Oura
2. Calculates a "decision readiness" score
3. Shows it in Raycast with one keystroke

Now before any important email, purchase, or commitment, I just hit ⌘+Space → "p360" and know if I should proceed or wait.

**The algorithm (v1, intentionally simple):**
- Base: Readiness Score (or Sleep Score if unavailable)
- Modifier: HRV Balance (±5 points)

**Example use cases:**
- About to send a confrontational email? Check first.
- Big purchase decision? See if you're in an optimal state.
- Planning important meetings? Schedule when you're typically high.

Anyone else doing something similar? Would love to hear how you're using real-time biometric feedback.
```

---

## 4. Hacker News - Show HN

### Title
```
Show HN: P360 – Raycast extension for decision support using Oura biometrics
```

### Post
```
I built a Raycast extension that shows your "decision readiness" based on Oura Ring data.

Problem: I have years of sleep/HRV/readiness data but never check it when making actual decisions.

Solution: One keystroke (⌘+Space → "p360") shows if now is a good time for important decisions.

How it works:
- Connects to Oura API via OAuth
- Combines Readiness Score, Sleep Score, HRV Balance
- Returns a 0-100 score with recommendations

Tech stack:
- TypeScript + React (Raycast API)
- Oura API v2
- OAuth PKCE flow

The algorithm is intentionally simple:
- score = readinessScore ?? sleepScore
- hrvModifier = (hrvBalance - 50) * 0.1
- finalScore = clamp(0, 100, score + hrvModifier)

I'm not claiming this is scientifically rigorous - it's a useful heuristic that makes me pause before decisions when tired.

Raycast Store link: [STORE_URL]
Source (MIT): [GITHUB_URL if public]

Feedback welcome!
```

---

## 5. Twitter/X - Launch Thread

### Tweet 1 (Main)
```
Just launched P360 for Raycast 🚀

One keystroke tells you if now is a good time for important decisions.

Connects to your Oura Ring and shows your decision readiness score.

🟢 = Go for it
🔴 = Maybe wait

Free in Raycast Store: [LINK]

🧵 Here's why I built it...
```

### Tweet 2
```
I've tracked my sleep & HRV for 2+ years.

But I kept making bad decisions when tired:
- Impulse purchases
- Emails I'd regret
- Commitments I shouldn't make

The data was there. I just never checked it at the right moment.
```

### Tweet 3
```
Now it takes 1 second:

⌘ + Space → "p360" → See my readiness

If I'm below 50, I wait.
If I'm above 70, I proceed confidently.

Simple, but it's changed how I approach decisions.
```

### Tweet 4
```
The algorithm is intentionally simple:

Base = Oura Readiness Score
Modifier = HRV Balance (±5 pts)

Not trying to be scientifically perfect.
Just a useful heuristic that makes me pause.
```

### Tweet 5
```
If you use Raycast + Oura, give it a try:

[RAYCAST STORE LINK]

Privacy-first: Your data stays between you and Oura.

Would love feedback on what to add next.
Calendar integration? Email warnings? Let me know 👇
```

---

## 6. Launch Timing Strategy

### Best Days
- **Product Hunt**: Tuesday-Thursday (avoid Monday/Friday)
- **Hacker News**: Tuesday-Wednesday morning (US time)
- **Reddit**: Evening US time

### Recommended Sequence
1. **Day 0**: Raycast Store 승인 확인
2. **Day 1 (Tuesday)**:
   - 오전 9시 PST: Product Hunt 런칭
   - Twitter 런칭 스레드
3. **Day 1-2**:
   - Reddit r/raycast 포스트
   - Reddit r/Biohackers 포스트
4. **Day 2-3**:
   - Hacker News Show HN

### 주의사항
- 모든 채널에 동시 포스팅하지 말 것 (스팸으로 보일 수 있음)
- 각 채널에서 engagement에 빠르게 응답할 것
- Product Hunt는 24시간 내 upvote 집중이 중요

---

## 7. Assets Checklist

런칭 전 준비할 것들:

- [ ] 스크린샷 3장 (Raycast Store용)
- [ ] Extension 아이콘 (512x512)
- [ ] Product Hunt 썸네일 (1270x760)
- [ ] Demo GIF (Twitter용, 15초 이내)
- [ ] GitHub repo public (선택)
