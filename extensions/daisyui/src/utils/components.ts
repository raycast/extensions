export interface daisyUIComponent {
  name: string;
  description: string;
  imageUrl: string;
  componentUrl: string;
  section: string;
  exampleHTML: string;
  exampleJSX: string;
}

// 🖱️ ACTIONS
export const Components: daisyUIComponent[] = [
  {
    name: "Button",
    description: "Buttons allow the user to take actions or make choices.",
    imageUrl: "https://img.daisyui.com/images/components/button.webp",
    componentUrl: "https://v5.daisyui.com/components/button",
    section: "Actions",
    exampleHTML: '<button class="btn">Default</button>',
    exampleJSX: `<button className="btn">Default</button>`,
  },
  {
    name: "Dropdown",
    description: "Dropdown can open a menu or any other element when the button is clicked.",
    imageUrl: "https://img.daisyui.com/images/components/dropdown.webp",
    componentUrl: "https://v5.daisyui.com/components/dropdown",
    section: "Actions",
    exampleHTML: `<details class="dropdown">
    <summary class="btn m-1">open or close</summary>
    <ul class="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
      <li><a>Item 1</a></li>
      <li><a>Item 2</a></li>
    </ul>
    </details>`,
    exampleJSX: `<details className="dropdown">
    <summary className="btn m-1">open or close</summary>
    <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
    <li><a>Item 1</a></li>
    <li><a>Item 2</a></li>
    </ul>
    </details>`,
  },
  {
    name: "Modal",
    description: "Modal is used to show a dialog or a box when you click a button.",
    imageUrl: "https://img.daisyui.com/images/components/modal.webp",
    componentUrl: "https://v5.daisyui.com/components/modal",
    section: "Actions",
    exampleHTML: `<!-- Open the modal using ID.showModal() method -->
  <button class="btn" onclick="my_modal_1.showModal()">open modal</button>
  <dialog id="my_modal_1" class="modal">
    <div class="modal-box">
      <h3 class="text-lg font-bold">Hello!</h3>
      <p class="py-4">Press ESC key or click the button below to close</p>
      <div class="modal-action">
      <form method="dialog">
      <!-- if there is a button in form, it will close the modal -->
      <button class="btn">Close</button>
      </form>
      </div>
    </div>
  </dialog>`,
    exampleJSX: `{/* Open the modal using document.getElementById('ID').showModal() method */}
  <button className="btn" onClick={()=>document.getElementById('my_modal_1').showModal()}>open modal</button>
  <dialog id="my_modal_1" className="modal">
    <div className="modal-box">
      <h3 className="font-bold text-lg">Hello!</h3>
      <p className="py-4">Press ESC key or click the button below to close</p>
      <div className="modal-action">
        <form method="dialog">
          {/* if there is a button in form, it will close the modal */}
          <button className="btn">Close</button>
        </form>
      </div>
    </div>
  </dialog>`,
  },
  {
    name: "Swap",
    description: "Swap allows you to toggle the visibility of two elements using a checkbox or a class name.",
    imageUrl: "https://img.daisyui.com/images/components/swap.webp",
    componentUrl: "https://v5.daisyui.com/components/swap",
    section: "Actions",
    exampleHTML: `<label class="swap">
    <input type="checkbox" />
    <div class="swap-on">ON</div>
    <div class="swap-off">OFF</div>
  </label>`,
    exampleJSX: `<label className="swap">
    <input type="checkbox" />
    <div className="swap-on">ON</div>
    <div className="swap-off">OFF</div>
  </label>`,
  },
  {
    name: "Theme Controller",
    description:
      "If a checked checkbox input or a checked radio input with theme-controller class exists in the page, The page will have the same theme as that input's value.",
    imageUrl: "https://img.daisyui.com/images/components/theme-controller.webp",
    componentUrl: "https://v5.daisyui.com/components/theme-controller",
    section: "Actions",
    exampleHTML: `<input type="checkbox" value="synthwave" class="toggle theme-controller" />`,
    exampleJSX: `<input type="checkbox" value="synthwave" className="toggle theme-controller" />`,
  },

  // 🖥️ DATA DISPLAY
  {
    name: "Accordion",
    description: "Accordion is used for showing and hiding content but only one item can stay open at a time.",
    imageUrl: "https://img.daisyui.com/images/components/accordion.webp",
    componentUrl: "https://v5.daisyui.com/components/accordion",
    section: "Data Display",
    exampleHTML: `<div class="collapse bg-base-100 border border-base-300">
    <input type="radio" name="my-accordion-1" checked="checked" />
    <div class="collapse-title font-semibold">How do I create an account?</div>
    <div class="collapse-content text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</div>
  </div>
  <div class="collapse bg-base-100 border border-base-300">
    <input type="radio" name="my-accordion-1" />
    <div class="collapse-title font-semibold">I forgot my password. What should I do?</div>
    <div class="collapse-content text-sm">Click on "Forgot Password" on the login page and follow the instructions sent to your email.</div>
  </div>
  <div class="collapse bg-base-100 border border-base-300">
    <input type="radio" name="my-accordion-1" />
    <div class="collapse-title font-semibold">How do I update my profile information?</div>
    <div class="collapse-content text-sm">Go to "My Account" settings and select "Edit Profile" to make changes.</div>
  </div>`,
    exampleJSX: `<div className="collapse bg-base-100 border border-base-300">
    <input type="radio" name="my-accordion-1" defaultChecked />
    <div className="collapse-title font-semibold">How do I create an account?</div>
    <div className="collapse-content text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</div>
  </div>
  <div className="collapse bg-base-100 border border-base-300">
    <input type="radio" name="my-accordion-1" />
    <div className="collapse-title font-semibold">I forgot my password. What should I do?</div>
    <div className="collapse-content text-sm">Click on "Forgot Password" on the login page and follow the instructions sent to your email.</div>
  </div>
  <div className="collapse bg-base-100 border border-base-300">
    <input type="radio" name="my-accordion-1" />
    <div className="collapse-title font-semibold">How do I update my profile information?</div>
    <div className="collapse-content text-sm">Go to "My Account" settings and select "Edit Profile" to make changes.</div>
  </div>`,
  },
  {
    name: "Avatar",
    description: "Avatars are used to show a thumbnail representation of an individual or business in the interface.",
    imageUrl: "https://img.daisyui.com/images/components/avatar.webp",
    componentUrl: "https://v5.daisyui.com/components/avatar",
    section: "Data Display",
    exampleHTML: `<div class="avatar">
    <div class="w-24 rounded">
      <img src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" />
    </div>
  </div>`,
    exampleJSX: `<div className="avatar">
    <div className="w-24 rounded">
      <img src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" />
    </div>
  </div>`,
  },
  {
    name: "Badge",
    description: "Badges are used to inform the user of the status of specific data.",
    imageUrl: "https://img.daisyui.com/images/components/badge.webp",
    componentUrl: "https://v5.daisyui.com/components/badge",
    section: "Data Display",
    exampleHTML: `<span class="badge">Badge</span>`,
    exampleJSX: `<span className="badge">Badge</span>`,
  },
  {
    name: "Card",
    description: "Cards are used to group and display content in a way that is easily readable.",
    imageUrl: "https://img.daisyui.com/images/components/card.webp",
    componentUrl: "https://v5.daisyui.com/components/card",
    section: "Data Display",
    exampleHTML: `<div class="card bg-base-100 w-96 shadow-sm">
    <figure>
      <img
        src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp"
        alt="Shoes" />
    </figure>
    <div class="card-body">
      <h2 class="card-title">Card Title</h2>
      <p>A card component has a figure, a body part, and inside body there are title and actions parts</p>
      <div class="card-actions justify-end">
        <button class="btn btn-primary">Buy Now</button>
      </div>
    </div>
  </div>`,
    exampleJSX: `<div className="card bg-base-100 w-96 shadow-sm">
    <figure>
      <img
        src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp"
        alt="Shoes" />
    </figure>
    <div className="card-body">
      <h2 className="card-title">Card Title</h2>
      <p>A card component has a figure, a body part, and inside body there are title and actions parts</p>
      <div className="card-actions justify-end">
        <button className="btn btn-primary">Buy Now</button>
      </div>
    </div>
  </div>`,
  },
  {
    name: "Carousel",
    description: "Carousel show images or content in a scrollable area.",
    imageUrl: "https://img.daisyui.com/images/components/carousel.webp",
    componentUrl: "https://v5.daisyui.com/components/carousel",
    section: "Data Display",
    exampleHTML: `<div class="carousel rounded-box">
    <div class="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
        alt="Burger" />
    </div>
    <div class="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
        alt="Burger" />
    </div>
    <div class="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
        alt="Burger" />
    </div>
    <div class="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
        alt="Burger" />
    </div>
    <div class="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
        alt="Burger" />
    </div>
    <div class="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
        alt="Burger" />
    </div>
    <div class="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
        alt="Burger" />
    </div>
  </div>`,
    exampleJSX: `<div className="carousel rounded-box">
    <div className="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
        alt="Burger" />
    </div>
    <div className="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
        alt="Burger" />
    </div>
    <div className="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
        alt="Burger" />
    </div>
    <div className="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
        alt="Burger" />
    </div>
    <div className="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
        alt="Burger" />
    </div>
    <div className="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
        alt="Burger" />
    </div>
    <div className="carousel-item">
      <img
        src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
        alt="Burger" />
    </div>
  </div>`,
  },
  {
    name: "Chat bubble",
    description:
      "Chat bubbles are used to show one line of conversation and all its data, including the author image, author name, time, etc.",
    imageUrl: "https://img.daisyui.com/images/components/chat.webp",
    componentUrl: "https://v5.daisyui.com/components/chat",
    section: "Data Display",
    exampleHTML: `<div class="chat chat-start">
    <div class="chat-bubble">
      It's over Anakin,
      <br />
      I have the high ground.
    </div>
  </div>
  <div class="chat chat-end">
    <div class="chat-bubble">You underestimate my power!</div>
  </div>`,
    exampleJSX: `<div className="chat chat-start">
    <div className="chat-bubble">
      It's over Anakin,
      <br />
      I have the high ground.
    </div>
  </div>
  <div className="chat chat-end">
    <div className="chat-bubble">You underestimate my power!</div>
  </div>`,
  },
  {
    name: "Collapse",
    description: "Collapse is used for showing and hiding content.",
    imageUrl: "https://img.daisyui.com/images/components/collapse.webp",
    componentUrl: "https://v5.daisyui.com/components/collapse",
    section: "Data Display",
    exampleHTML: `<div tabindex="0" class="collapse bg-base-100 border border-base-300">
    <div class="collapse-title font-semibold">How do I create an account?</div>
    <div class="collapse-content text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</div>
  </div>`,
    exampleJSX: `<div tabIndex={0} className="collapse bg-base-100 border border-base-300">
    <div className="collapse-title font-semibold">How do I create an account?</div>
    <div className="collapse-content text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</div>
  </div>`,
  },
  {
    name: "Countdown",
    description: "Countdown gives you a transition effect when you change a number between 0 to 99.",
    imageUrl: "https://img.daisyui.com/images/components/countdown.webp",
    componentUrl: "https://v5.daisyui.com/components/countdown",
    section: "Data Display",
    exampleHTML: `<span class="countdown">
    <span style="--value:59;">59</span>
  </span>`,
    exampleJSX: `{/* For TSX uncomment the commented types below */}
  <span className="countdown">
    <span style={{"--value":59} /* as React.CSSProperties */ }>59</span>
  </span>`,
  },
  {
    name: "Diff",
    description: "Diff component shows a side-by-side comparison of two items.",
    imageUrl: "https://img.daisyui.com/images/components/diff.webp",
    componentUrl: "https://v5.daisyui.com/components/diff",
    section: "Data Display",
    exampleHTML: `<figure class="diff aspect-16/9" tabindex="0">
      <div class="diff-item-1" role="img">
        <img alt="daisy" src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a.webp" />
      </div>
      <div class="diff-item-2" role="img" tabindex="0">
        <img
          alt="daisy"
          src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a-blur.webp" />
      </div>
      <div class="diff-resizer"></div>
    </figure>`,
    exampleJSX: `<figure className="diff aspect-16/9" tabIndex={0}>
      <div className="diff-item-1" role="img">
        <img alt="daisy" src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a.webp" />
      </div>
      <div className="diff-item-2" role="img" tabIndex={0}>
        <img
          alt="daisy"
          src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a-blur.webp" />
      </div>
      <div className="diff-resizer"></div>
    </figure>`,
  },
  {
    name: "Kbd",
    description: "Kbd is used to display keyboard shortcuts.",
    imageUrl: "https://img.daisyui.com/images/components/kbd.webp",
    componentUrl: "https://v5.daisyui.com/components/kbd",
    section: "Data Display",
    exampleHTML: `<kbd class="kbd">K</kbd>`,
    exampleJSX: `<kbd className="kbd">K</kbd>`,
  },
  {
    name: "List",
    description: "List is a vertical layout to display information in rows.",
    imageUrl: "https://img.daisyui.com/images/components/list.webp",
    componentUrl: "https://v5.daisyui.com/components/kbd",
    section: "Data Display",
    exampleHTML: `<ul class="list bg-base-100 rounded-box shadow-md">

    <li class="p-4 pb-2 text-xs opacity-60 tracking-wide">Most played songs this week</li>

    <li class="list-row">
      <div><img class="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/1@94.webp"/></div>
      <div>
        <div>Dio Lupa</div>
        <div class="text-xs uppercase font-semibold opacity-60">Remaining Reason</div>
      </div>
      <button class="btn btn-square btn-ghost">
        <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg>
      </button>
      <button class="btn btn-square btn-ghost">
        <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></g></svg>
      </button>
    </li>

    <li class="list-row">
      <div><img class="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/4@94.webp"/></div>
      <div>
        <div>Ellie Beilish</div>
        <div class="text-xs uppercase font-semibold opacity-60">Bears of a fever</div>
      </div>
      <button class="btn btn-square btn-ghost">
        <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg>
      </button>
      <button class="btn btn-square btn-ghost">
        <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></g></svg>
      </button>
    </li>

    <li class="list-row">
      <div><img class="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/3@94.webp"/></div>
      <div>
        <div>Sabrino Gardener</div>
        <div class="text-xs uppercase font-semibold opacity-60">Cappuccino</div>
      </div>
      <button class="btn btn-square btn-ghost">
        <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg>
      </button>
      <button class="btn btn-square btn-ghost">
        <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></g></svg>
      </button>
    </li>

  </ul>`,
    exampleJSX: `<ul className="list bg-base-100 rounded-box shadow-md">

    <li className="p-4 pb-2 text-xs opacity-60 tracking-wide">Most played songs this week</li>

    <li className="list-row">
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/1@94.webp"/></div>
      <div>
        <div>Dio Lupa</div>
        <div className="text-xs uppercase font-semibold opacity-60">Remaining Reason</div>
      </div>
      <button className="btn btn-square btn-ghost">
        <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg>
      </button>
      <button className="btn btn-square btn-ghost">
        <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></g></svg>
      </button>
    </li>

    <li className="list-row">
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/4@94.webp"/></div>
      <div>
        <div>Ellie Beilish</div>
        <div className="text-xs uppercase font-semibold opacity-60">Bears of a fever</div>
      </div>
      <button className="btn btn-square btn-ghost">
        <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg>
      </button>
      <button className="btn btn-square btn-ghost">
        <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></g></svg>
      </button>
    </li>

    <li className="list-row">
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/3@94.webp"/></div>
      <div>
        <div>Sabrino Gardener</div>
        <div className="text-xs uppercase font-semibold opacity-60">Cappuccino</div>
      </div>
      <button className="btn btn-square btn-ghost">
        <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg>
      </button>
      <button className="btn btn-square btn-ghost">
        <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></g></svg>
      </button>
    </li>

  </ul>`,
  },
  {
    name: "Stat",
    description: "Stat is used to show numbers and data in a block.",
    imageUrl: "https://img.daisyui.com/images/components/stat.webp",
    componentUrl: "https://v5.daisyui.com/components/stat",
    section: "Data Display",
    exampleHTML: `<div class="stats shadow">
    <div class="stat">
      <div class="stat-title">Total Page Views</div>
      <div class="stat-value">89,400</div>
      <div class="stat-desc">21% more than last month</div>
    </div>
  </div>`,
    exampleJSX: `<div className="stats shadow">
    <div className="stat">
      <div className="stat-title">Total Page Views</div>
      <div className="stat-value">89,400</div>
      <div className="stat-desc">21% more than last month</div>
    </div>
  </div>`,
  },
  {
    name: "Status",
    description:
      "Status is a really small icon to visually show the current status of an element, like online, offline, error, etc.",
    imageUrl: "https://img.daisyui.com/images/components/status.webp",
    componentUrl: "https://v5.daisyui.com/components/status",
    section: "Data Display",
    exampleHTML: `<span class="status"></span>`,
    exampleJSX: `<span className="status"></span>`,
  },
  {
    name: "Table",
    description: "Table can be used to show a list of data in a table format.",
    imageUrl: "https://img.daisyui.com/images/components/table.webp",
    componentUrl: "https://v5.daisyui.com/components/table",
    section: "Data Display",
    exampleHTML: `<div class="overflow-x-auto">
    <table class="table">
    <!-- head -->
    <thead>
      <tr>
        <th></th>
        <th>Name</th>
        <th>Job</th>
        <th>Favorite Color</th>
      </tr>
    </thead>
    <tbody>
      <!-- row 1 -->
      <tr>
        <th>1</th>
        <td>Cy Ganderton</td>
        <td>Quality Control Specialist</td>
        <td>Blue</td>
      </tr>
      <!-- row 2 -->
      <tr>
        <th>2</th>
        <td>Hart Hagerty</td>
        <td>Desktop Support Technician</td>
        <td>Purple</td>
      </tr>
      <!-- row 3 -->
      <tr>
        <th>3</th>
        <td>Brice Swyre</td>
        <td>Tax Accountant</td>
        <td>Red</td>
      </tr>
    </tbody>
    </table>
    </div>`,
    exampleJSX: `<div className="overflow-x-auto">
    <table className="table">
    {/* head */}
    <thead>
      <tr>
        <th></th>
        <th>Name</th>
        <th>Job</th>
        <th>Favorite Color</th>
      </tr>
    </thead>
    <tbody>
      {/* row 1 */}
      <tr>
        <th>1</th>
        <td>Cy Ganderton</td>
        <td>Quality Control Specialist</td>
        <td>Blue</td>
      </tr>
      {/* row 2 */}
      <tr>
        <th>2</th>
        <td>Hart Hagerty</td>
        <td>Desktop Support Technician</td>
        <td>Purple</td>
      </tr>
      {/* row 3 */}
      <tr>
        <th>3</th>
        <td>Brice Swyre</td>
        <td>Tax Accountant</td>
        <td>Red</td>
      </tr>
    </tbody>
    </table>
    </div>`,
  },
  {
    name: "Timeline",
    description: "Timeline component shows a list of events in chronological order.",
    imageUrl: "https://img.daisyui.com/images/components/timeline.webp",
    componentUrl: "https://v5.daisyui.com/components/timeline",
    section: "Data Display",
    exampleHTML: `<ul class="timeline">
    <li>
    <div class="timeline-start">1984</div>
    <div class="timeline-middle">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="h-5 w-5">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd" />
      </svg>
    </div>
    <div class="timeline-end timeline-box">First Macintosh computer</div>
    <hr />
    </li>
    <li>
    <hr />
    <div class="timeline-start">1998</div>
    <div class="timeline-middle">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="h-5 w-5">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd" />
      </svg>
    </div>
    <div class="timeline-end timeline-box">iMac</div>
    <hr />
    </li>
    <li>
    <hr />
    <div class="timeline-start">2001</div>
    <div class="timeline-middle">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="h-5 w-5">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd" />
      </svg>
    </div>
    <div class="timeline-end timeline-box">iPod</div>
    <hr />
    </li>
    <li>
    <hr />
    <div class="timeline-start">2007</div>
    <div class="timeline-middle">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="h-5 w-5">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd" />
      </svg>
    </div>
    <div class="timeline-end timeline-box">iPhone</div>
    <hr />
    </li>
    <li>
    <hr />
    <div class="timeline-start">2015</div>
    <div class="timeline-middle">
      <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="h-5 w-5">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clip-rule="evenodd" />
        </svg>
      </div>
      <div class="timeline-end timeline-box">Apple Watch</div>
    </li>
    </ul>`,
    exampleJSX: `<ul className="timeline">
    <li>
      <div className="timeline-start">1984</div>
      <div className="timeline-middle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="h-5 w-5">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd" />
        </svg>
      </div>
      <div className="timeline-end timeline-box">First Macintosh computer</div>
      <hr />
    </li>
    <li>
      <hr />
      <div className="timeline-start">1998</div>
      <div className="timeline-middle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="h-5 w-5">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd" />
        </svg>
      </div>
      <div className="timeline-end timeline-box">iMac</div>
      <hr />
    </li>
    <li>
      <hr />
      <div className="timeline-start">2001</div>
      <div className="timeline-middle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="h-5 w-5">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd" />
        </svg>
      </div>
      <div className="timeline-end timeline-box">iPod</div>
      <hr />
    </li>
    <li>
      <hr />
      <div className="timeline-start">2007</div>
      <div className="timeline-middle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="h-5 w-5">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd" />
        </svg>
      </div>
      <div className="timeline-end timeline-box">iPhone</div>
      <hr />
    </li>
    <li>
      <hr />
      <div className="timeline-start">2015</div>
      <div className="timeline-middle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="h-5 w-5">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd" />
        </svg>
      </div>
      <div className="timeline-end timeline-box">Apple Watch</div>
    </li>
    </ul>`,
  },

  // 🔗 NAVIGATION
  {
    name: "Breadcrumbs",
    description: "Breadcrumbs helps users to navigate through the website.",
    imageUrl: "https://img.daisyui.com/images/components/breadcrumbs.webp",
    componentUrl: "https://v5.daisyui.com/components/breadcrumbs",
    section: "Navigation",
    exampleHTML: `<div class="breadcrumbs text-sm">
    <ul>
      <li><a>Home</a></li>
      <li><a>Documents</a></li>
      <li>Add Document</li>
    </ul>
    </div>`,
    exampleJSX: `<div className="breadcrumbs text-sm">
    <ul>
      <li><a>Home</a></li>
      <li><a>Documents</a></li>
      <li>Add Document</li>
    </ul>
    </div>`,
  },
  {
    name: "Dock",
    description:
      "Dock (also know as Bottom navigation or Bottom bar) is a UI element that provides navigation options to the user. Dock sticks to the bottom of the screen.",
    imageUrl: "https://img.daisyui.com/images/components/dock.webp",
    componentUrl: "https://v5.daisyui.com/components/dock",
    section: "Navigation",
    exampleHTML: `<div class="dock">
    <button>
      <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor" stroke-linejoin="miter" stroke-linecap="butt"><polyline points="1 11 12 2 23 11" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="2"></polyline><path d="m5,13v7c0,1.105.895,2,2,2h10c1.105,0,2-.895,2-2v-7" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></path><line x1="12" y1="22" x2="12" y2="18" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></line></g></svg>
      <span class="dock-label">Home</span>
    </button>

    <button class="dock-active">
      <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor" stroke-linejoin="miter" stroke-linecap="butt"><polyline points="3 14 9 14 9 17 15 17 15 14 21 14" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="2"></polyline><rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></rect></g></svg>
      <span class="dock-label">Inbox</span>
    </button>

    <button>
      <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor" stroke-linejoin="miter" stroke-linecap="butt"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></circle><path d="m22,13.25v-2.5l-2.318-.966c-.167-.581-.395-1.135-.682-1.654l.954-2.318-1.768-1.768-2.318.954c-.518-.287-1.073-.515-1.654-.682l-.966-2.318h-2.5l-.966,2.318c-.581.167-1.135.395-1.654.682l-2.318-.954-1.768,1.768.954,2.318c-.287.518-.515,1.073-.682,1.654l-2.318.966v2.5l2.318.966c.167.581.395,1.135.682,1.654l-.954,2.318,1.768,1.768,2.318-.954c.518.287,1.073.515,1.654.682l.966,2.318h2.5l.966-2.318c.581-.167,1.135-.395,1.654-.682l2.318.954,1.768-1.768-.954-2.318c.287-.518.515-1.073.682-1.654l2.318-.966Z" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></path></g></svg>
      <span class="dock-label">Settings</span>
    </button>
    </div>`,
    exampleJSX: `<div className="dock">
    <button>
      <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor" strokeLinejoin="miter" strokeLinecap="butt"><polyline points="1 11 12 2 23 11" fill="none" stroke="currentColor" stroke-miterlimit="10" strokeWidth="2"></polyline><path d="m5,13v7c0,1.105.895,2,2,2h10c1.105,0,2-.895,2-2v-7" fill="none" stroke="currentColor" strokeLinecap="square" stroke-miterlimit="10" strokeWidth="2"></path><line x1="12" y1="22" x2="12" y2="18" fill="none" stroke="currentColor" strokeLinecap="square" stroke-miterlimit="10" strokeWidth="2"></line></g></svg>
      <span className="dock-label">Home</span>
    </button>

    <button className="dock-active">
      <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor" strokeLinejoin="miter" strokeLinecap="butt"><polyline points="3 14 9 14 9 17 15 17 15 14 21 14" fill="none" stroke="currentColor" stroke-miterlimit="10" strokeWidth="2"></polyline><rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" strokeLinecap="square" stroke-miterlimit="10" strokeWidth="2"></rect></g></svg>
      <span className="dock-label">Inbox</span>
    </button>

    <button>
      <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor" strokeLinejoin="miter" strokeLinecap="butt"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeLinecap="square" stroke-miterlimit="10" strokeWidth="2"></circle><path d="m22,13.25v-2.5l-2.318-.966c-.167-.581-.395-1.135-.682-1.654l.954-2.318-1.768-1.768-2.318.954c-.518-.287-1.073-.515-1.654-.682l-.966-2.318h-2.5l-.966,2.318c-.581.167-1.135.395-1.654.682l-2.318-.954-1.768,1.768.954,2.318c-.287.518-.515,1.073-.682,1.654l-2.318.966v2.5l2.318.966c.167.581.395,1.135.682,1.654l-.954,2.318,1.768,1.768,2.318-.954c.518.287,1.073.515,1.654.682l.966,2.318h2.5l.966-2.318c.581-.167,1.135-.395,1.654-.682l2.318.954,1.768-1.768-.954-2.318c.287-.518.515-1.073.682-1.654l2.318-.966Z" fill="none" stroke="currentColor" strokeLinecap="square" stroke-miterlimit="10" strokeWidth="2"></path></g></svg>
      <span className="dock-label">Settings</span>
    </button>
    </div>`,
  },
  {
    name: "Link",
    description: "Link adds the missing underline style to links.",
    imageUrl: "https://img.daisyui.com/images/components/link.webp",
    componentUrl: "https://v5.daisyui.com/components/link",
    section: "Navigation",
    exampleHTML: `<a class="link">Click me</a>`,
    exampleJSX: `<a className="link">Click me</a>`,
  },
  {
    name: "Menu",
    description: "Menu is used to display a list of links vertically or horizontally.",
    imageUrl: "https://img.daisyui.com/images/components/menu.webp",
    componentUrl: "https://v5.daisyui.com/components/menu",
    section: "Navigation",
    exampleHTML: `<ul class="menu bg-base-200 rounded-box w-56">
    <li><a>Item 1</a></li>
    <li><a>Item 2</a></li>
    <li><a>Item 3</a></li>
    </ul>`,
    exampleJSX: `<ul className="menu bg-base-200 rounded-box w-56">
    <li><a>Item 1</a></li>
    <li><a>Item 2</a></li>
    <li><a>Item 3</a></li>
    </ul>`,
  },
  {
    name: "Navbar",
    description: "Navbar is used to show a navigation bar on the top of the page.",
    imageUrl: "https://img.daisyui.com/images/components/navbar.webp",
    componentUrl: "https://v5.daisyui.com/components/navbar",
    section: "Navigation",
    exampleHTML: `<div class="navbar bg-base-100 shadow-sm">
    <a class="btn btn-ghost text-xl">daisyUI</a>
    </div>`,
    exampleJSX: `<div className="navbar bg-base-100 shadow-sm">
    <a className="btn btn-ghost text-xl">daisyUI</a>
    </div>`,
  },
  {
    name: "Pagination",
    description: "Pagination is a group of buttons that allow the user to navigate between a set of related content.",
    imageUrl: "https://img.daisyui.com/images/components/pagination.webp",
    componentUrl: "https://v5.daisyui.com/components/pagination",
    section: "Navigation",
    exampleHTML: `<div class="join">
    <button class="join-item btn">1</button>
    <button class="join-item btn btn-active">2</button>
    <button class="join-item btn">3</button>
    <button class="join-item btn">4</button>
    </div>`,
    exampleJSX: `<div className="join">
    <button className="join-item btn">1</button>
    <button className="join-item btn btn-active">2</button>
    <button className="join-item btn">3</button>
    <button className="join-item btn">4</button>
    </div>`,
  },
  {
    name: "Steps",
    description: "Steps can be used to show a list of steps in a process.",
    imageUrl: "https://img.daisyui.com/images/components/steps.webp",
    componentUrl: "https://v5.daisyui.com/components/steps",
    section: "Navigation",
    exampleHTML: `<ul class="steps">
    <li class="step step-primary">Register</li>
    <li class="step step-primary">Choose plan</li>
    <li class="step">Purchase</li>
    <li class="step">Receive Product</li>
    </ul>`,
    exampleJSX: `<ul className="steps">
    <li className="step step-primary">Register</li>
    <li className="step step-primary">Choose plan</li>
    <li className="step">Purchase</li>
    <li className="step">Receive Product</li>
    </ul>`,
  },
  {
    name: "Tab",
    description: "Tabs can be used to show a list of links in a tabbed format.",
    imageUrl: "https://img.daisyui.com/images/components/tab.webp",
    componentUrl: "https://v5.daisyui.com/components/tab",
    section: "Navigation",
    exampleHTML: `<div role="tablist" class="tabs">
    <a role="tab" class="tab">Tab 1</a>
    <a role="tab" class="tab tab-active">Tab 2</a>
    <a role="tab" class="tab">Tab 3</a>
    </div>`,
    exampleJSX: `<div role="tablist" className="tabs">
    <a role="tab" className="tab">Tab 1</a>
    <a role="tab" className="tab tab-active">Tab 2</a>
    <a role="tab" className="tab">Tab 3</a>
    </div>`,
  },

  // 💬 FEEDBACK
  {
    name: "Alert",
    description: "Alert informs users about important events.",
    imageUrl: "https://img.daisyui.com/images/components/alert.webp",
    componentUrl: "https://v5.daisyui.com/components/alert",
    section: "Feedback",
    exampleHTML: `<div role="alert" class="alert">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info h-6 w-6 shrink-0">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <span>12 unread messages. Tap to see.</span>
    </div>`,
    exampleJSX: `<div role="alert" className="alert">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info h-6 w-6 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <span>12 unread messages. Tap to see.</span>
    </div>`,
  },
  {
    name: "Loading",
    description: "Loading shows an animation to indicate that something is loading.",
    imageUrl: "https://img.daisyui.com/images/components/loading.webp",
    componentUrl: "https://v5.daisyui.com/components/loading",
    section: "Feedback",
    exampleHTML: `<span class="loading loading-spinner loading-xs"></span>
<span class="loading loading-spinner loading-sm"></span>
<span class="loading loading-spinner loading-md"></span>
<span class="loading loading-spinner loading-lg"></span>`,
    exampleJSX: `<span className="loading loading-spinner loading-xs"></span>
<span className="loading loading-spinner loading-sm"></span>
<span className="loading loading-spinner loading-md"></span>
<span className="loading loading-spinner loading-lg"></span>`,
  },
  {
    name: "Progress",
    description: "Progress bar can be used to show the progress of a task or to show the passing of time.",
    imageUrl: "https://img.daisyui.com/images/components/progress.webp",
    componentUrl: "https://v5.daisyui.com/components/progress",
    section: "Feedback",
    exampleHTML: `<progress class="progress w-56" value="0" max="100"></progress>
<progress class="progress w-56" value="10" max="100"></progress>
<progress class="progress w-56" value="40" max="100"></progress>
<progress class="progress w-56" value="70" max="100"></progress>
<progress class="progress w-56" value="100" max="100"></progress>`,
    exampleJSX: `<progress className="progress w-56" value={0} max="100"></progress>
<progress className="progress w-56" value="10" max="100"></progress>
<progress className="progress w-56" value="40" max="100"></progress>
<progress className="progress w-56" value="70" max="100"></progress>
<progress className="progress w-56" value="100" max="100"></progress>`,
  },
  {
    name: "Radial progress",
    description: "Radial progress can be used to show the progress of a task or to show the passing of time.",
    imageUrl: "https://img.daisyui.com/images/components/radial-progress.webp",
    componentUrl: "https://v5.daisyui.com/components/radial-progress",
    section: "Feedback",
    exampleHTML: `<div class="radial-progress" style="--value:70;" role="progressbar">70%</div>`,
    exampleJSX: `<div className="radial-progress" style={{ "--value": 70 }} role="progressbar">
  70%
</div>`,
  },
  {
    name: "Skeleton",
    description: "Skeleton is a component that can be used to show a loading state of a component.",
    imageUrl: "https://img.daisyui.com/images/components/skeleton.webp",
    componentUrl: "https://v5.daisyui.com/components/skeleton",
    section: "Feedback",
    exampleHTML: `<div class="skeleton h-32 w-32"></div>`,
    exampleJSX: `<div className="skeleton h-32 w-32"></div>`,
  },
  {
    name: "Toast",
    description: "Toast is a wrapper to stack elements, positioned on the corner of page.",
    imageUrl: "https://img.daisyui.com/images/components/toast.webp",
    componentUrl: "https://v5.daisyui.com/components/toast",
    section: "Feedback",
    exampleHTML: `<div class="toast">
  <div class="alert alert-info">
    <span>New message arrived.</span>
  </div>
</div>`,
    exampleJSX: `<div className="toast">
  <div className="alert alert-info">
    <span>New message arrived.</span>
  </div>
</div>`,
  },
  {
    name: "Tooltip",
    description: "Tooltip can be used to show a message when hovering over an element.",
    imageUrl: "https://img.daisyui.com/images/components/tooltip.webp",
    componentUrl: "https://v5.daisyui.com/components/tooltip",
    section: "Feedback",
    exampleHTML: `<div class="tooltip" data-tip="hello">
  <button class="btn">Hover me</button>
</div>`,
    exampleJSX: `<div className="tooltip" data-tip="hello">
  <button className="btn">Hover me</button>
</div>`,
  },
  // ✏️ DATA INPUT
  {
    name: "Calendar",
    description: "Calendar includes styles for different calendar libraries.",
    imageUrl: "https://img.daisyui.com/images/components/calendar.webp",
    componentUrl: "https://v5.daisyui.com/components/calendar",
    section: "Data Input",
    exampleHTML: `<!--
    * Import Cally web component from CDN
    <script type="module" src="https://unpkg.com/cally"></script>

    * Or install as a dependency:
    npm i cally
    * and import it in JS
    import "cally";
    -->

    <calendar-date class="cally bg-base-100 border border-base-300 shadow-lg rounded-box">
    <svg aria-label="Previous" class="size-4" slot="previous" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5"></path></svg>
    <svg aria-label="Next" class="size-4" slot="next" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5"></path></svg>
    <calendar-month></calendar-month>
    </calendar-date>`,
    exampleJSX: `{/*
    * Import Cally web component from CDN
    <script type="module" src="https://unpkg.com/cally"></script>

    * Or install as a dependency:
    npm i cally
    * and import it in JS
    import "cally";
    */}

    <calendar-date class="cally bg-base-100 border border-base-300 shadow-lg rounded-box">
    <svg aria-label="Previous" className="size-4" slot="previous" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5"></path></svg>
    <svg aria-label="Next" className="size-4" slot="next" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5"></path></svg>
    <calendar-month></calendar-month>
    </calendar-date>`,
  },
  {
    name: "Checkbox",
    description: "Checkboxes are used to select or deselect a value.",
    imageUrl: "https://img.daisyui.com/images/components/checkbox.webp",
    componentUrl: "https://v5.daisyui.com/components/checkbox",
    section: "Data Input",
    exampleHTML: `<input type="checkbox" checked="checked" class="checkbox" />`,
    exampleJSX: `<input type="checkbox" defaultChecked className="checkbox" />`,
  },
  {
    name: "Fieldset",
    description:
      "Fieldset is a container for grouping related form elements. It includes fieldset-legend as a title and fieldset-label as a description.",
    imageUrl: "https://img.daisyui.com/images/components/fieldset.webp",
    componentUrl: "https://v5.daisyui.com/components/fieldset",
    section: "Data Input",
    exampleHTML: `<fieldset class="fieldset">
    <legend class="fieldset-legend">Page title</legend>
    <input type="text" class="input" placeholder="My awesome page" />
    <p class="fieldset-label">You can edit page title later on from settings</p>
    </fieldset>`,
    exampleJSX: `<fieldset className="fieldset">
    <legend className="fieldset-legend">Page title</legend>
    <input type="text" className="input" placeholder="My awesome page" />
    <p className="fieldset-label">You can edit page title later on from settings</p>
    </fieldset>`,
  },
  {
    name: "File Input",
    description: "File Input is a an input field for uploading files.",
    imageUrl: "https://img.daisyui.com/images/components/file-input.webp",
    componentUrl: "https://v5.daisyui.com/components/file-input",
    section: "Data Input",
    exampleHTML: `<input type="file" class="file-input" />`,
    exampleJSX: `<input type="file" className="file-input" />`,
  },
  {
    name: "Filter",
    description:
      "Filter is a group of radio buttons. Choosing one of the options will hide the others and shows a reset button next to the chosen option.",
    imageUrl: "https://img.daisyui.com/images/components/filter.webp",
    componentUrl: "https://v5.daisyui.com/components/filter",
    section: "Data Input",
    exampleHTML: `<form class="filter">
    <input class="btn btn-square" type="reset" value="×"/>
    <input class="btn" type="radio" name="frameworks" aria-label="Svelte"/>
    <input class="btn" type="radio" name="frameworks" aria-label="Vue"/>
    <input class="btn" type="radio" name="frameworks" aria-label="React"/>
    </form>`,
    exampleJSX: `<form className="filter">
    <input className="btn btn-square" type="reset" value="×"/>
    <input className="btn" type="radio" name="frameworks" aria-label="Svelte"/>
    <input className="btn" type="radio" name="frameworks" aria-label="Vue"/>
    <input className="btn" type="radio" name="frameworks" aria-label="React"/>
    </form>`,
  },
  {
    name: "Label",
    description:
      "Label is used to provide a name or title for an input field. Label can be placed before or after the field.",
    imageUrl: "https://img.daisyui.com/images/components/label.webp",
    componentUrl: "https://v5.daisyui.com/components/label",
    section: "Data Input",
    exampleHTML: `<label class="input">
    <span class="label">https://</span>
    <input type="text" placeholder="URL" />
    </label>`,
    exampleJSX: `<label className="input">
    <span className="label">https://</span>
    <input type="text" placeholder="URL" />
    </label>`,
  },
  {
    name: "Radio",
    description: "Radio buttons allow the user to select one option from a set.",
    imageUrl: "https://img.daisyui.com/images/components/radio.webp",
    componentUrl: "https://v5.daisyui.com/components/radio",
    section: "Data Input",
    exampleHTML: `<input type="radio" name="radio-1" class="radio" checked="checked" />
    <input type="radio" name="radio-1" class="radio" />`,
    exampleJSX: `<input type="radio" name="radio-1" className="radio" defaultChecked />
    <input type="radio" name="radio-1" className="radio" />`,
  },
  {
    name: "Range",
    description: "Range slider is used to select a value by sliding a handle.",
    imageUrl: "https://img.daisyui.com/images/components/range.webp",
    componentUrl: "https://v5.daisyui.com/components/range",
    section: "Data Input",
    exampleHTML: `<input type="range" min="0" max="100" value="40" class="range" />`,
    exampleJSX: `<input type="range" min={0} max="100" value="40" className="range" />`,
  },
  {
    name: "Rating",
    description: "Rating is a set of radio buttons that allow the user to rate something.",
    imageUrl: "https://img.daisyui.com/images/components/rating.webp",
    componentUrl: "https://v5.daisyui.com/components/rating",
    section: "Data Input",
    exampleHTML: `<div class="rating">
    <input type="radio" name="rating-1" class="mask mask-star" aria-label="1 star" />
    <input type="radio" name="rating-1" class="mask mask-star" aria-label="2 star" checked="checked" />
    <input type="radio" name="rating-1" class="mask mask-star" aria-label="3 star" />
    <input type="radio" name="rating-1" class="mask mask-star" aria-label="4 star" />
    <input type="radio" name="rating-1" class="mask mask-star" aria-label="5 star" />
    </div>`,
    exampleJSX: `<div className="rating">
    <input type="radio" name="rating-1" className="mask mask-star" aria-label="1 star" />
    <input type="radio" name="rating-1" className="mask mask-star" aria-label="2 star" defaultChecked />
    <input type="radio" name="rating-1" className="mask mask-star" aria-label="3 star" />
    <input type="radio" name="rating-1" className="mask mask-star" aria-label="4 star" />
    <input type="radio" name="rating-1" className="mask mask-star" aria-label="5 star" />
    </div>`,
  },
  {
    name: "Select",
    description: "Select is used to pick a value from a list of options.",
    imageUrl: "https://img.daisyui.com/images/components/select.webp",
    componentUrl: "https://v5.daisyui.com/components/select",
    section: "Data Input",
    exampleHTML: `<select class="select">
    <option disabled selected>Pick a color</option>
    <option>Crimson</option>
    <option>Amber</option>
    <option>Velvet</option>
    </select>`,
    exampleJSX: `<select defaultValue="Pick a color" className="select">
    <option disabled={true}>Pick a color</option>
    <option>Crimson</option>
    <option>Amber</option>
    <option>Velvet</option>
    </select>`,
  },
  {
    name: "Input Field",
    description: "Text Input is a simple input field.",
    imageUrl: "https://img.daisyui.com/images/components/input.webp",
    componentUrl: "https://v5.daisyui.com/components/input",
    section: "Data Input",
    exampleHTML: `<input type="text" placeholder="Type here" class="input" />`,
    exampleJSX: `<input type="text" placeholder="Type here" className="input" />`,
  },
  {
    name: "Textarea",
    description: "Textarea allows users to enter text in multiple lines.",
    imageUrl: "https://img.daisyui.com/images/components/textarea.webp",
    componentUrl: "https://v5.daisyui.com/components/textarea",
    section: "Data Input",
    exampleHTML: `<textarea class="textarea" placeholder="Bio"></textarea>`,
    exampleJSX: `<textarea className="textarea" placeholder="Bio"></textarea>`,
  },
  {
    name: "Toggle",
    description: "Toggle is a checkbox that is styled to look like a switch button.",
    imageUrl: "https://img.daisyui.com/images/components/toggle.webp",
    componentUrl: "https://v5.daisyui.com/components/toggle",
    section: "Data Input",
    exampleHTML: `<input type="checkbox" checked="checked" class="toggle" />`,
    exampleJSX: `<input type="checkbox" defaultChecked className="toggle" />`,
  },
  {
    name: "Validator",
    description:
      "Validator class changes the color of form elements to error or success based on input's validation rules.",
    imageUrl: "https://img.daisyui.com/images/components/validator.webp",
    componentUrl: "https://v5.daisyui.com/components/validator",
    section: "Data Input",
    exampleHTML: `<input class="input validator" type="email" required placeholder="mail@site.com" />`,
    exampleJSX: `<input className="input validator" type="email" required placeholder="mail@site.com" />`,
  },
  // 📐 LAYOUT
  {
    name: "Divider",
    description: "Divider will be used to separate content vertically or horizontally.",
    imageUrl: "https://img.daisyui.com/images/components/divider.webp",
    componentUrl: "https://v5.daisyui.com/components/divider",
    section: "Layout",
    exampleHTML: `<div class="flex w-full flex-col">
    <div class="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
    <div class="divider">OR</div>
    <div class="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
    </div>`,
    exampleJSX: `<div className="flex w-full flex-col">
    <div className="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
    <div className="divider">OR</div>
    <div className="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
    </div>`,
  },
  {
    name: "Drawer",
    description: "Drawer is a grid layout that can show/hide a sidebar on the left or right side of the page.",
    imageUrl: "https://img.daisyui.com/images/components/drawer.webp",
    componentUrl: "https://v5.daisyui.com/components/drawer",
    section: "Layout",
    exampleHTML: `<div class="drawer">
    <input id="my-drawer" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content">
      <!-- Page content here -->
      <label for="my-drawer" class="btn btn-primary drawer-button">Open drawer</label>
    </div>
    <div class="drawer-side">
      <label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
      <ul class="menu bg-base-200 text-base-content min-h-full w-80 p-4">
        <!-- Sidebar content here -->
        <li><a>Sidebar Item 1</a></li>
        <li><a>Sidebar Item 2</a></li>
      </ul>
    </div>
    </div>`,
    exampleJSX: `<div className="drawer">
    <input id="my-drawer" type="checkbox" className="drawer-toggle" />
    <div className="drawer-content">
      {/* Page content here */}
      <label htmlFor="my-drawer" className="btn btn-primary drawer-button">Open drawer</label>
    </div>
    <div className="drawer-side">
      <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
      <ul className="menu bg-base-200 text-base-content min-h-full w-80 p-4">
        {/* Sidebar content here */}
        <li><a>Sidebar Item 1</a></li>
        <li><a>Sidebar Item 2</a></li>
      </ul>
    </div>
    </div>`,
  },
  {
    name: "Footer",
    description: "Footer can contain logo, copyright notice, and links to other pages.",
    imageUrl: "https://img.daisyui.com/images/components/footer.webp",
    componentUrl: "https://v5.daisyui.com/components/footer",
    section: "Layout",
    exampleHTML: `<footer class="footer sm:footer-horizontal bg-neutral text-neutral-content p-10">
    <nav>
      <h6 class="footer-title">Services</h6>
      <a class="link link-hover">Branding</a>
      <a class="link link-hover">Design</a>
      <a class="link link-hover">Marketing</a>
      <a class="link link-hover">Advertisement</a>
    </nav>
    <nav>
      <h6 class="footer-title">Company</h6>
      <a class="link link-hover">About us</a>
      <a class="link link-hover">Contact</a>
      <a class="link link-hover">Jobs</a>
      <a class="link link-hover">Press kit</a>
    </nav>
    <nav>
      <h6 class="footer-title">Legal</h6>
      <a class="link link-hover">Terms of use</a>
      <a class="link link-hover">Privacy policy</a>
      <a class="link link-hover">Cookie policy</a>
    </nav>
    </footer>`,
    exampleJSX: `<footer className="footer sm:footer-horizontal bg-neutral text-neutral-content p-10">
    <nav>
      <h6 className="footer-title">Services</h6>
      <a className="link link-hover">Branding</a>
      <a className="link link-hover">Design</a>
      <a className="link link-hover">Marketing</a>
      <a className="link link-hover">Advertisement</a>
    </nav>
    <nav>
      <h6 className="footer-title">Company</h6>
      <a className="link link-hover">About us</a>
      <a className="link link-hover">Contact</a>
      <a className="link link-hover">Jobs</a>
      <a className="link link-hover">Press kit</a>
    </nav>
    <nav>
      <h6 className="footer-title">Legal</h6>
      <a className="link link-hover">Terms of use</a>
      <a className="link link-hover">Privacy policy</a>
      <a className="link link-hover">Cookie policy</a>
    </nav>
    </footer>`,
  },
  {
    name: "Hero",
    description: "Hero is a component for displaying a large box or image with a title and description.",
    imageUrl: "https://img.daisyui.com/images/components/hero.webp",
    componentUrl: "https://v5.daisyui.com/components/hero",
    section: "Layout",
    exampleHTML: `<div class="hero bg-base-200 min-h-screen">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-5xl font-bold">Hello there</h1>
        <p class="py-6">
          Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi exercitationem
          quasi. In deleniti eaque aut repudiandae et a id nisi.
        </p>
        <button class="btn btn-primary">Get Started</button>
      </div>
    </div>
    </div>`,
    exampleJSX: `<div className="hero bg-base-200 min-h-screen">
    <div className="hero-content text-center">
      <div className="max-w-md">
        <h1 className="text-5xl font-bold">Hello there</h1>
        <p className="py-6">
          Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi exercitationem
          quasi. In deleniti eaque aut repudiandae et a id nisi.
        </p>
        <button className="btn btn-primary">Get Started</button>
      </div>
    </div>
    </div>`,
  },
  {
    name: "Indicator",
    description: "Indicators are used to place an element on the corner of another element.",
    imageUrl: "https://img.daisyui.com/images/components/indicator.webp",
    componentUrl: "https://v5.daisyui.com/components/indicator",
    section: "Layout",
    exampleHTML: `<div class="indicator">
    <span class="indicator-item status status-success"></span>
    <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
    </div>`,
    exampleJSX: `<div className="indicator">
    <span className="indicator-item status status-success"></span>
    <div className="bg-base-300 grid h-32 w-32 place-items-center">content</div>
    </div>`,
  },
  {
    name: "Join (group items)",
    description:
      "Join is a container for grouping multiple items, it can be used to group buttons, inputs, etc. Join applies border radius to the first and last item. Join can be used to create a horizontal or vertical list of items.",
    imageUrl: "https://img.daisyui.com/images/components/join.webp",
    componentUrl: "https://v5.daisyui.com/components/join",
    section: "Layout",
    exampleHTML: `<div class="join">
    <button class="btn join-item">Button</button>
    <button class="btn join-item">Button</button>
    <button class="btn join-item">Button</button>
    </div>`,
    exampleJSX: `<div className="join">
    <button className="btn join-item">Button</button>
    <button className="btn join-item">Button</button>
    <button className="btn join-item">Button</button>
    </div>`,
  },
  {
    name: "Mask",
    description: "Mask crops the content of the element to common shapes.",
    imageUrl: "https://img.daisyui.com/images/components/mask.webp",
    componentUrl: "https://v5.daisyui.com/components/mask",
    section: "Layout",
    exampleHTML: `<img
    class="mask mask-squircle"
    src="https://img.daisyui.com/images/stock/photo-1567653418876-5bb0e566e1c2.webp" />`,
    exampleJSX: `<img
    class="mask mask-squircle"
    src="https://img.daisyui.com/images/stock/photo-1567653418876-5bb0e566e1c2.webp" />`,
  },
  {
    name: "Stack",
    description: "Stack visually puts elements on top of each other.",
    imageUrl: "https://img.daisyui.com/images/components/stack.webp",
    componentUrl: "https://v5.daisyui.com/components/stack",
    section: "Layout",
    exampleHTML: `<div class="stack h-20 w-32">
    <div class="bg-primary text-primary-content grid place-content-center rounded-box">1</div>
    <div class="bg-accent text-accent-content grid place-content-center rounded-box">2</div>
    <div class="bg-secondary text-secondary-content grid place-content-center rounded-box">
      3
    </div>
    </div>`,
    exampleJSX: `<div className="stack h-20 w-32">
    <div className="bg-primary text-primary-content grid place-content-center rounded-box">1</div>
    <div className="bg-accent text-accent-content grid place-content-center rounded-box">2</div>
    <div className="bg-secondary text-secondary-content grid place-content-center rounded-box">
      3
    </div>
    </div>`,
  },
  {
    name: "Browser",
    description: "Browser mockup shows a box that looks like a browser window.",
    imageUrl: "https://img.daisyui.com/images/components/mockup-browser.webp",
    componentUrl: "https://v5.daisyui.com/components/mockup-browser",
    section: "Mockup",
    exampleHTML: `<div class="mockup-browser border-base-300 border w-full">
    <div class="mockup-browser-toolbar">
    <div class="input">https://daisyui.com</div>
    </div>
    <div class="grid place-content-center border-t border-base-300 h-80">Hello!</div>
  </div>`,
    exampleJSX: `<div className="mockup-browser border-base-300 border w-full">
    <div className="mockup-browser-toolbar">
    <div className="input">https://daisyui.com</div>
    </div>
    <div className="grid place-content-center border-t border-base-300 h-80">Hello!</div>
</div>`,
  },
  {
    name: "Code",
    description: "Code mockup is used to show a block of code in a box that looks like a code editor.",
    imageUrl: "https://img.daisyui.com/images/components/mockup-code.webp",
    componentUrl: "https://v5.daisyui.com/components/mockup-code",
    section: "Mockup",
    exampleHTML: `<div class="mockup-code w-full">
    <pre data-prefix="$"><code>npm i daisyui</code></pre>
    </div>`,
    exampleJSX: `<div className="mockup-code w-full">
    <pre data-prefix="$"><code>npm i daisyui</code></pre>
    </div>`,
  },
  {
    name: "Phone",
    description: "Phone mockup shows a mockup of an iPhone.",
    imageUrl: "https://img.daisyui.com/images/components/mockup-phone.webp",
    componentUrl: "https://v5.daisyui.com/components/mockup-phone",
    section: "Mockup",
    exampleHTML: `<div class="mockup-phone">
    <div class="mockup-phone-camera"></div>
    <div class="mockup-phone-display text-white grid place-content-center">It's Glowtime.</div>
    </div>`,
    exampleJSX: `<div className="mockup-phone">
    <div className="mockup-phone-camera"></div>
    <div className="mockup-phone-display text-white grid place-content-center">It's Glowtime.</div>
    </div>`,
  },
  {
    name: "Window",
    description: "Window mockup shows a box that looks like an operating system window.",
    imageUrl: "https://img.daisyui.com/images/components/mockup-window.webp",
    componentUrl: "https://v5.daisyui.com/components/mockup-window",
    section: "Mockup",
    exampleHTML: `<div class="mockup-window border border-base-300 w-full">
    <div class="grid place-content-center border-t border-base-300 h-80">Hello!</div>
    </div>`,
    exampleJSX: `<div className="mockup-window border border-base-300 w-full">
    <div className="grid place-content-center border-t border-base-300 h-80">Hello!</div>
    </div>`,
  },
];
