import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isLoggedOut, parseLeaderboardIds, parseSubmit, parseYearStars } from "../src/lib/parse.ts";

// Trimmed from adventofcode.com/events while logged in: the header and the total also use star-count
const EVENTS = `
<header><div class="user">someone <span class="star-count">24*</span></div></header>
<main><article>
<div class="eventlist-event"><a href="/">[2026]</a>          </div>
<div class="eventlist-event"><a href="/2025">[2025]</a> <span class="star-count">24*</span> <span class="quiet">/ 24*</span> <a class="supporter-badge" title="Advent of Code Supporter">(AoC++)</a></div>
<div class="eventlist-event"><a href="/2024">[2024]</a> <span class="star-count">7*</span> <span class="quiet">/ 50*</span></div>
<div class="eventlist-event"><a href="/2023">[2023]</a>          </div>
<p>Total stars: <span class="star-count">31*</span></p>
</article></main>`;

const EVENTS_LOGGED_OUT = `
<div class="eventlist-event"><a href="/">[2026]</a>          </div>
<div class="eventlist-event"><a href="/2025">[2025]</a>          </div>`;

// Shaped like adventofcode.com/2025/leaderboard/private while logged in: only the view links matter
const BOARDS = `
<header><nav><a href="/2026/leaderboard/private">[Leaderboards]</a></nav></header>
<main><article>
<form method="post" action="/2025/leaderboard/private/join"><input type="text" name="code"/></form>
<p>You can <a href="/2025/leaderboard/private/view/111111">[View]</a> your own private leaderboard.</p>
<div><a href="/2025/leaderboard/private/view/222222">[View]</a> Some Team's leaderboard</div>
<div><a href="/2025/leaderboard/private/view/333333">[View]</a> Another Team's leaderboard</div>
<div><a href="/2025/leaderboard/private/view/222222">[View]</a> Some Team's leaderboard</div>
</article></main>`;

// adventofcode.com/2025/leaderboard/private while logged out
const BOARDS_LOGGED_OUT = `
<header><nav><ul><li><a href="/2026/auth/login">[Log In]</a></li></ul></nav></header>
<main>
<p>Advent of Code 2025 <a href="/2025/about#faq_leaderboard">doesn't have</a> a global leaderboard. To see private leaderboards, you need to <a href="/2025/auth/login">[Log In]</a>.</p>
</main>`;

function answerPage(text) {
  return `<main><article><p>${text}</p></article></main>`;
}

describe("parseYearStars", () => {
  test("reads the stars of every event and ignores the header and the total", () => {
    assert.deepEqual(parseYearStars(EVENTS), { 2026: 0, 2025: 24, 2024: 7, 2023: 0 });
  });

  test("gives every event zero stars when logged out", () => {
    assert.deepEqual(parseYearStars(EVENTS_LOGGED_OUT), { 2026: 0, 2025: 0 });
  });
});

describe("parseLeaderboardIds", () => {
  test("lists every private leaderboard once, in page order", () => {
    assert.deepEqual(parseLeaderboardIds(BOARDS), ["111111", "222222", "333333"]);
    assert.equal(isLoggedOut(BOARDS), false);
  });

  test("finds none on the logged out page, which counts as logged out", () => {
    assert.deepEqual(parseLeaderboardIds(BOARDS_LOGGED_OUT), []);
    assert.equal(isLoggedOut(BOARDS_LOGGED_OUT), true);
  });
});

describe("parseSubmit", () => {
  test("wrong answer", () => {
    const result = parseSubmit(
      answerPage(
        `That's not the right answer; your answer is too low.  If you're stuck, make sure you're using the full input data; there are also some general tips on the <a href="/2015/about">about page</a>, or you can ask for hints on the <a href="https://www.reddit.com/r/adventofcode/" target="_blank">subreddit</a>.  Please wait one minute before trying again. <a href="/2015/day/1">[Return to Day 1]</a>`,
      ),
    );
    assert.equal(result.status, "wrong");
    assert.match(result.message, /your answer is too low/);
    assert.doesNotMatch(result.message, /Return to/);
  });

  test("answered too recently", () => {
    const result = parseSubmit(
      answerPage(
        `You gave an answer too recently; you have to wait after submitting an answer before trying again.  You have 41s left to wait. <a href="/2015/day/1">[Return to Day 1]</a>`,
      ),
    );
    assert.equal(result.status, "wait");
    assert.match(result.message, /You have 41s left to wait\.$/);
  });

  test("already solved", () => {
    const result = parseSubmit(
      answerPage(
        `You don't seem to be solving the right level.  Did you already complete it? <a href="/2015/day/1">[Return to Day 1]</a>`,
      ),
    );
    assert.equal(result.status, "solved");
  });

  test("right answer", () => {
    const result = parseSubmit(
      answerPage(
        `That's the right answer!  You are <span class="day-success">one gold star</span> closer to saving Christmas. <a href="/2015/day/1#part2">[Continue to Part Two]</a>`,
      ),
    );
    assert.equal(result.status, "correct");
    assert.doesNotMatch(result.message, /Continue to/);
  });
});
