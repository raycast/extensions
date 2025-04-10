<p align="center">
   <img src="https://github.com/user-attachments/assets/5a071695-98be-42fd-97a1-2a7018068c49">
 </p>

Terminal and Raycast have partnered to bring you a limited edition coffee roast.

With this extension, you can buy _Flow_ as well as all other bags that Terminal has to offer directly from Raycast.

To celebrate this release, Raycast made a mini-doc about Flow. [Watch it on YouTube](https://youtu.be/H0nSmyuhFkE)!

### Some design choices...

#### master-controller

Most of the UI is a controller-view pattern where main component is `<List isShowingDetail={true} />` which gives a 1/3 2/3 layout.
kinda laid out as follows

```jsx
<List isShowingDetail={true}>
  <List.Item detail={<List.Item.Detail markdown={renderMarkdown(values)} />} />
</List>
```

The right pane is the result of `renderMarkdown(values)`, which can include images if we so choose to add in some ✨zaz✨.

A crazy idea would be to have things render to an svg, and get the markdown to load that, perhaps by dataurl idk. There are some 100mb memory constraints.

#### react query

given sheer number of pages and distinct components involved I opened to use react-query as it has a shared caching model,
removing the need for crazy propdrilling, and making it much easier to do single-flight mutations and optimistic updates (though kinda manually)

for example, the way the routing is handle here isn't so much like a dom where things are nested, but rather "pushing" the next component onto the stack.
I noticed that new component that you pushed _wasn't a child of the parent_, although you can pass props to it. but with the flow of

```tsx
<Cart /> -> <Address /> -> <Cards /> -> <Confirm /> -> <Receipt />
```

The `<Confirm />` page needs product list, cart items, chosen addressId, and chosen cardId, as well as the addresses and cards lists to hydrate the IDs. Prop drilling that is insane as they're picked up along the way.

On top of that, I was assuming that the `useCachedPromise()` from raycast's libs would do something like `react-query` and share the state to all the hooks that used the
same "dependency array". `useCachedPromise(() => fetch(...), [someKeys])`. This was not the case, all the components would rip up the api and would break a lot of opti-ui
and single flight mutations.

react query solved all of this.

but because new routes you push to aren't children of the prior, had to create a `withQc(<Cards />)` HOC wrapper to make it such that the query client was shared between them.
