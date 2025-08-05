# Laravel version updates

When a new laravel version comes out you should execute the following script on the documentation page of that version E.g. https://laravel.com/docs/8.x:

```js
let list = {};
document
  .querySelector(".docs_sidebar ul")
  .querySelectorAll(":scope >li")
  .forEach((element) => {
    let listHeader = element.querySelector(":scope > h2");
    let listItems = element.querySelectorAll(":scope > ul > li > a");
    if (!listHeader || !listItems) return;

    list[listHeader.innerText] = [...listItems].map((anchor) => {
      return { title: anchor.innerText, url: anchor.href };
    });
  });

console.log(JSON.stringify(list, null, 2));
```

This will build you the file you should save in `assets/documentation`

Ensure you match the version format like in the https://laravel.com/docs/8.x url. 8.x.json

It is also good practice to bring assets/documentation/master.json up-to-date with https://laravel.com/docs/master
