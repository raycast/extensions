import type { LetterboxdSearchResponse } from "../movie-data";

export const searchResponseFixture: LetterboxdSearchResponse = {
  next: "cursor=next%3D%3D",
  items: [
    {
      type: "FilmSearchItem",
      film: {
        id: "1skk",
        name: "Inception",
        link: "https://letterboxd.com/film/inception/",
        releaseYear: 2010,
        rating: 4.239,
        runTime: 148,
        top250Position: 249,
        directors: [{ name: "Christopher Nolan" }],
        genres: [{ name: "Action" }, { name: "Science Fiction" }],
        poster: {
          sizes: [
            { width: 150, height: 225, url: "https://images.example/150.jpg" },
            { width: 300, height: 450, url: "https://images.example/300.jpg" },
          ],
        },
        links: [
          {
            type: "letterboxd",
            url: "https://letterboxd.com/film/inception/",
          },
          { type: "imdb", url: "https://www.imdb.com/title/tt1375666/" },
          { type: "tmdb", url: "https://www.themoviedb.org/movie/27205" },
        ],
      },
    },
    { type: "MemberSearchItem" },
    {
      type: "FilmSearchItem",
      film: {
        id: "broken",
        name: "Broken Film",
        link: "https://letterboxd.com/not-a-film/",
      },
    },
  ],
};

export const movieDetailsFixture = `<!doctype html>
<html>
  <head>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Movie",
        "name": "Inception",
        "image": "https://images.example/poster.jpg",
        "dateCreated": "2010-07-08",
        "inLanguage": ["en", "fr"],
        "actor": [
          { "name": "Leonardo DiCaprio", "sameAs": "https://letterboxd.com/actor/leonardo-dicaprio/" },
          { "name": "Joseph Gordon-Levitt" }
        ],
        "productionCompany": [{ "name": "Syncopy", "sameAs": "https://letterboxd.com/studio/syncopy/" }],
        "countryOfOrigin": [{ "name": "UK" }, { "name": "USA" }],
        "aggregateRating": { "ratingValue": 4.24, "ratingCount": 2500000 }
      }
    </script>
  </head>
  <body>
    <h1 class="headline-1 primaryname"><span class="name">Inception</span></h1>
    <div class="review body-text"><p>A dream within a dream.</p></div>
    <a href="/films/year/2010/">2010</a>
    <div class="text-link text-footer">148 mins More at IMDb</div>
    <a href="/director/christopher-nolan/">Christopher Nolan</a>
    <a href="/films/genre/action/">Action</a>
    <a href="/films/genre/science-fiction/">Science Fiction</a>
    <section class="film-reviews">
      <div class="listitem">
        <article class="production-viewing">
          <a class="avatar"><img alt="Reviewer" /></a>
          <div class="js-review-body">Great movie.</div>
          <div class="attribution-detail"><a class="context" href="/review/123/">Review</a></div>
          <span class="rating">★★★★½</span>
          <span class="icon-comment"><span class="label">12</span></span>
        </article>
      </div>
    </section>
    <h3 class="release-table-title">Theatrical</h3>
    <div>
      <div class="listitem">
        <div class="cell"><h5 class="date">16 Jul 2010</h5></div>
        <ul class="release-country-list">
          <li><span class="name">USA</span><span class="flag"><img src="https://images.example/us.png" /></span></li>
        </ul>
      </div>
    </div>
  </body>
</html>`;
