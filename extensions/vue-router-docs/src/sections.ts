import { Section } from "./types";

const sections: Section[] = [
  {
    title: "Setup",
    items: [
      { title: "Introduction", url: "https://router.vuejs.org/introduction.html" },
      { title: "Installation", url: "https://router.vuejs.org/installation.html" },
    ],
  },
  {
    title: "Essentials",
    items: [
      { title: "Getting Started", url: "https://router.vuejs.org/guide/" },
      { title: "Dynamic Route Matching", url: "https://router.vuejs.org/guide/essentials/dynamic-matching.html" },
      { title: "Routes' Matching Syntax", url: "https://router.vuejs.org/guide/essentials/route-matching-syntax.html" },
      { title: "Named Routes", url: "https://router.vuejs.org/guide/essentials/named-routes.html" },
      { title: "Nested Routes", url: "https://router.vuejs.org/guide/essentials/nested-routes.html" },
      { title: "Programmatic Navigation", url: "https://router.vuejs.org/guide/essentials/navigation.html" },
      { title: "Named Views", url: "https://router.vuejs.org/guide/essentials/named-views.html" },
      { title: "Redirect and Alias", url: "https://router.vuejs.org/guide/essentials/redirect-and-alias.html" },
      {
        title: "Passing Props to Route Components",
        url: "https://router.vuejs.org/guide/essentials/passing-props.html",
      },
      { title: "Active links", url: "https://router.vuejs.org/guide/essentials/active-links.html" },
      { title: "Different History modes", url: "https://router.vuejs.org/guide/essentials/history-mode.html" },
    ],
  },
  {
    title: "Advanced",
    items: [
      { title: "Navigation guards", url: "https://router.vuejs.org/guide/advanced/navigation-guards.html" },
      { title: "Route Meta Fields", url: "https://router.vuejs.org/guide/advanced/meta.html" },
      { title: "Data Fetching", url: "https://router.vuejs.org/guide/advanced/data-fetching.html" },
      { title: "Composition API", url: "https://router.vuejs.org/guide/advanced/composition-api.html" },
      { title: "RouterView slot", url: "https://router.vuejs.org/guide/advanced/router-view-slot.html" },
      { title: "Transitions", url: "https://router.vuejs.org/guide/advanced/transitions.html" },
      { title: "Scroll Behavior", url: "https://router.vuejs.org/guide/advanced/scroll-behavior.html" },
      { title: "Lazy Loading Routes", url: "https://router.vuejs.org/guide/advanced/lazy-loading.html" },
      { title: "Typed Routes", url: "https://router.vuejs.org/guide/advanced/typed-routes.html" },
      { title: "Extending RouterLink", url: "https://router.vuejs.org/guide/advanced/extending-router-link.html" },
      { title: "Navigation Failures", url: "https://router.vuejs.org/guide/advanced/navigation-failures.html" },
      { title: "Dynamic Routing", url: "https://router.vuejs.org/guide/advanced/dynamic-routing.html" },
    ],
  },
  {
    title: "Miscellaneous",
    items: [{ title: "Migrating from Vue 2", url: "https://router.vuejs.org/guide/migration/" }],
  },
];

export default sections;
