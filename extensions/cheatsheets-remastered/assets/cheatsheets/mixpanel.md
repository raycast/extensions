---
title: Mixpanel
category: Analytics
tech: mixpanel
status: active
lastReviewed: '2025-09-05'
---

### Identify

```js
mixpanel.identify('284')
mixpanel.people.set({ $email: 'hi@gmail.com' })
```

```js
// Set common properties
mixpanel.register({ age: 28, gender: 'male' })
```

### Track events

```js
mixpanel.track('Login success')
mixpanel.track('Search', { query: 'cheese' })
```

### References

* <https://mixpanel.com/help/reference/javascript>
