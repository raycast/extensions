---
title: App provider
category: Utilities
keywords:
  - app
  - provider
  - appprovider
  - internationalization
  - i18n
  - localization
  - context
  - translate
  - translation
  - application wrapper
  - wrapper
  - sdk
examples:
  - fileName: app-provider-default.tsx
    title: Default
    description: AppProvider works by default without any additional options passed to it.
  - fileName: app-provider-with-i18n.tsx
    title: With i18n
    description: With an `i18n`, `AppProvider` will provide these translations to polaris components. See [using translations](https://polaris.shopify.com/components/app-provider#using-translations)
  - fileName: app-provider-with-link-component.tsx
    title: With linkComponent
    description: With a `linkComponent`, the app provider component will override the links used in other components. For example you may want to use the `Link` component provided by `react-router` throughout your application instead of the default `a` tag.
previewImg: /images/components/utilities/app-provider.png
---

# {frontmatter.title}

<Lede>

App provider is a required component that enables sharing global settings throughout the hierarchy of your application.

</Lede>

<Examples />

<Props componentName={frontmatter.title} />

## Best practices

The app provider component is required to use Polaris. Without it, the components in your application will not function correctly. You must wrap the root (the top) of your application in the app provider component.

---

## Using translations

Translations are provided in the locales folder. When using Polaris, you are able to import translations from all languages supported by the core Shopify product and consume them through the `i18n` prop.

If a project has only one locale, then you can pass the JSON content from the locale file into `AppProvider`.

```jsx
import {AppProvider} from '@shopify/polaris';
// en.json is English. Replace with fr.json for French, etc
import translations from '@shopify/polaris/locales/en.json';

function App() {
  return <AppProvider i18n={translations}>{/* App content */}</AppProvider>;
}
```

If a project supports multiple locales, then load them dynamically using [`@shopify/react-i18n`](https://github.com/Shopify/quilt/tree/master/packages/react-i18n#translation). This ensures that you load only the translations you need.

```jsx
import {AppProvider} from '@shopify/polaris';
// en.json is English. Replace with fr.json for French, etc
import translations from '@shopify/polaris/locales/en.json';
import {useI18n} from '@shopify/react-i18n';

function App() {
  const [i18n] = useI18n({
    id: 'Polaris',
    fallback: translations,
    translations(locale) {
      return import(
        /* webpackChunkName: "Polaris-i18n", webpackMode: "lazy-once" */ `@shopify/polaris/locales/${locale}.json`
      ).then((dictionary) => dictionary && dictionary.default);
    },
  });

  // i18n.translations is an array of translation dictionaries, where the first
  // dictionary is the desired language, and the second is the fallback.
  return (
    <AppProvider i18n={i18n.translations}>{/* App content */}</AppProvider>
  );
}
```

---

## Using linkComponent

By default Polaris renders `<Link>` elements (and action objects) as `<a>` tags. That works well for simple one-page demos. However for more complex multi-page applications that use a router such as [`react-router`](https://reacttraining.com/react-router/web) you will want links to use the components provided by your router. If you don't then every link will be an `<a>` tag and thus trigger a whole page refresh instead of navigating client-side.

The `linkComponent` prop allows you to customise how links behave within Polaris by allowing you to inject your router's own Link component. The following example demonstrates using react-router's `Link` component.

```jsx
import {BrowserRouter, Link as ReactRouterLink} from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <AppProvider linkComponent={Link}>
        {/* App content including your <Route> components */}
      </AppProvider>
    </BrowserRouter>
  );
}

const IS_EXTERNAL_LINK_REGEX = /^(?:[a-z][a-z\d+.-]*:|\/\/)/;

function Link({children, url = '', external, ref, ...rest}) {
  // react-router only supports links to pages it can handle itself. It does not
  // support arbirary links, so anything that is not a path-based link should
  // use a reglar old `a` tag
  if (external || IS_EXTERNAL_LINK_REGEX.test(url)) {
    rest.target = '_blank';
    rest.rel = 'noopener noreferrer';
    return (
      <a href={url} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <ReactRouterLink to={url} {...rest}>
      {children}
    </ReactRouterLink>
  );
}
```

---

## Testing components

You must include Polaris context in your tests when you use Polaris components.

To make this easier for you, we’ve provided:

- a PolarisTestProvider component to provide the Polaris contexts for you
