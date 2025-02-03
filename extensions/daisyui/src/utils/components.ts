export interface DaisyUIComponent {
  name: string;
  description: string;
  imageUrl: string;
  componentUrl: string;
  section: string;
  exampleHTML: string;
  exampleJSX: string;
}

export const Components: DaisyUIComponent[] = [
  {
    name: "Button",
    description: "Buttons allow the user to take actions or make choices.",
    imageUrl: "https://img.daisyui.com/images/components/button.webp",
    componentUrl: "https://daisyui.com/components/button",
    section: "Actions",
    exampleHTML: '<button class="btn">Button</button>',
    exampleJSX: `<button className="btn">Button</button>`,
  },
  {
    name: "Dropdown",
    description: "Dropdown can open a menu or any other element when the button is clicked.",
    imageUrl: "https://img.daisyui.com/images/components/dropdown.webp",
    componentUrl: "https://daisyui.com/components/dropdown",
    section: "Actions",
    exampleHTML: `<details class="dropdown">
    <summary class="btn m-1">open or close</summary>
    <ul class="menu dropdown-content bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
        <li><a>Item 1</a></li>
        <li><a>Item 2</a></li>
    </ul>
</details>`,
    exampleJSX: `<details className="dropdown">
    <summary className="btn m-1">open or close</summary>
    <ul className="menu dropdown-content bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
        <li><a>Item 1</a></li>
        <li><a>Item 2</a></li>
    </ul>
</details>`,
  },
  {
    name: "Modal",
    description: "Modal is used to show a dialog or a box when you click a button.",
    imageUrl: "https://img.daisyui.com/images/components/modal.webp",
    componentUrl: "https://daisyui.com/components/modal",
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
    componentUrl: "https://daisyui.com/components/swap",
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
    componentUrl: "https://daisyui.com/components/theme-controller",
    section: "Actions",
    exampleHTML: `<input type="checkbox" value="synthwave" class="toggle theme-controller" />`,
    exampleJSX: `<input type="checkbox" value="synthwave" className="toggle theme-controller" />`,
  },
  {
    name: "Accordion",
    description: "Accordion is used for showing and hiding content but only one item can stay open at a time.",
    imageUrl: "https://img.daisyui.com/images/components/accordion.webp",
    componentUrl: "https://daisyui.com/components/accordion",
    section: "Data Display",
    exampleHTML: `<div class="collapse bg-base-200">
  <input type="radio" name="my-accordion-1" checked="checked" />
  <div class="collapse-title text-xl font-medium">Click to open this one and close others</div>
  <div class="collapse-content">
    <p>hello</p>
  </div>
</div>
<div class="collapse bg-base-200">
  <input type="radio" name="my-accordion-1" />
  <div class="collapse-title text-xl font-medium">Click to open this one and close others</div>
  <div class="collapse-content">
    <p>hello</p>
  </div>
</div>
<div class="collapse bg-base-200">
  <input type="radio" name="my-accordion-1" />
  <div class="collapse-title text-xl font-medium">Click to open this one and close others</div>
  <div class="collapse-content">
    <p>hello</p>
  </div>
</div>`,
    exampleJSX: `<div className="collapse bg-base-200">
  <input type="radio" name="my-accordion-1" defaultChecked />
  <div className="collapse-title text-xl font-medium">Click to open this one and close others</div>
  <div className="collapse-content">
    <p>hello</p>
  </div>
</div>
<div className="collapse bg-base-200">
  <input type="radio" name="my-accordion-1" />
  <div className="collapse-title text-xl font-medium">Click to open this one and close others</div>
  <div className="collapse-content">
    <p>hello</p>
  </div>
</div>
<div className="collapse bg-base-200">
  <input type="radio" name="my-accordion-1" />
  <div className="collapse-title text-xl font-medium">Click to open this one and close others</div>
  <div className="collapse-content">
    <p>hello</p>
  </div>
</div>`,
  },
  {
    name: "Avatar",
    description: "Avatars are used to show a thumbnail representation of an individual or business in the interface.",
    imageUrl: "https://img.daisyui.com/images/components/avatar.webp",
    componentUrl: "https://daisyui.com/components/avatar",
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
    componentUrl: "https://daisyui.com/components/badge",
    section: "Data Display",
    exampleHTML: `<span class="badge">Badge</span>`,
    exampleJSX: `<span className="badge">Badge</span>`,
  },
  {
    name: "Card",
    description: "Cards are used to group and display content in a way that is easily readable.",
    imageUrl: "https://img.daisyui.com/images/components/card.webp",
    componentUrl: "https://daisyui.com/components/card",
    section: "Data Display",
    exampleHTML: `<div class="card bg-base-100 w-96 shadow-xl">
  <figure>
    <img
      src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp"
      alt="Shoes" />
  </figure>
  <div class="card-body">
    <h2 class="card-title">Shoes!</h2>
    <p>If a dog chews shoes whose shoes does he choose?</p>
    <div class="card-actions justify-end">
      <button class="btn btn-primary">Buy Now</button>
    </div>
  </div>
</div>`,
    exampleJSX: `<div className="card bg-base-100 w-96 shadow-xl">
  <figure>
    <img
      src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp"
      alt="Shoes" />
  </figure>
  <div className="card-body">
    <h2 className="card-title">Shoes!</h2>
    <p>If a dog chews shoes whose shoes does he choose?</p>
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
    componentUrl: "https://daisyui.com/components/carousel",
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
    componentUrl: "https://daisyui.com/components/chat",
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
    componentUrl: "https://daisyui.com/components/collapse",
    section: "Data Display",
    exampleHTML: `<div tabindex="0" class="collapse bg-base-200">
  <div class="collapse-title text-xl font-medium">Focus me to see content</div>
  <div class="collapse-content">
    <p>tabindex="0" attribute is necessary to make the div focusable</p>
  </div>
</div>`,
    exampleJSX: `<div tabIndex={0} className="collapse bg-base-200">
  <div className="collapse-title text-xl font-medium">Focus me to see content</div>
  <div className="collapse-content">
    <p>tabindex={0} attribute is necessary to make the div focusable</p>
  </div>
</div>`,
  },
  {
    name: "Countdown",
    description: "Countdown gives you a transition effect of changing numbers.",
    imageUrl: "https://img.daisyui.com/images/components/countdown.webp",
    componentUrl: "https://daisyui.com/components/countdown",
    section: "Data Display",
    exampleHTML: `<span class="countdown">
  <span style="--value:\${counter};"></span>
</span>`,
    exampleJSX: `<span className="countdown">
  <span style={{"--value":\${counter}}}></span>
</span>`,
  },
  {
    name: "Diff",
    description: "Diff component shows a side-by-side comparison of two items.",
    imageUrl: "https://img.daisyui.com/images/components/diff.webp",
    componentUrl: "https://daisyui.com/components/diff",
    section: "Data Display",
    exampleHTML: `<div class="diff aspect-[16/9]">
    <div class="diff-item-1">
      <img alt="daisy" src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a.webp" />
    </div>
    <div class="diff-item-2">
      <img
        alt="daisy"
        src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a-blur.webp" />
    </div>
    <div class="diff-resizer"></div>
  </div>`,
    exampleJSX: `<div className="diff aspect-[16/9]">
    <div className="diff-item-1">
      <img alt="daisy" src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a.webp" />
    </div>
    <div className="diff-item-2">
      <img
        alt="daisy"
        src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a-blur.webp" />
    </div>
    <div className="diff-resizer"></div>
  </div>`,
  },
  {
    name: "Kbd",
    description: "Kbd is used to display keyboard shortcuts.",
    imageUrl: "https://img.daisyui.com/images/components/kbd.webp",
    componentUrl: "https://daisyui.com/components/kbd",
    section: "Data Display",
    exampleHTML: `<kbd class="kbd">A</kbd>`,
    exampleJSX: `<kbd className="kbd">A</kbd>`,
  },
  {
    name: "Stat",
    description: "Stat is used to show numbers and data in a box.",
    imageUrl: "https://img.daisyui.com/images/components/stat.webp",
    componentUrl: "https://daisyui.com/components/stat",
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
    name: "Table",
    description: "Table can be used to show a list of data in a table format.",
    imageUrl: "https://img.daisyui.com/images/components/table.webp",
    componentUrl: "https://daisyui.com/components/table",
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
    componentUrl: "https://daisyui.com/components/timeline",
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
        className="h-5 w-5">
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
        className="h-5 w-5">
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
        className="h-5 w-5">
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
        className="h-5 w-5">
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
        className="h-5 w-5">
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
  {
    name: "Breadcrumbs",
    description: "Breadcrumbs helps users to navigate through the website.",
    imageUrl: "https://img.daisyui.com/images/components/breadcrumbs.webp",
    componentUrl: "https://daisyui.com/components/breadcrumbs",
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
    name: "Bottom navigation",
    description: "Bottom navigation bar allows navigation between primary screens.",
    imageUrl: "https://img.daisyui.com/images/components/bottom-navigation.webp",
    componentUrl: "https://daisyui.com/components/bottom-navigation",
    section: "Navigation",
    exampleHTML: `<div class="btm-nav">
  <button>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  </button>
  <button class="active">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </button>
  <button>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  </button>
</div>`,
    exampleJSX: `<div className="btm-nav">
  <button>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  </button>
  <button className="active">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </button>
  <button>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  </button>
</div>`,
  },
  {
    name: "Link",
    description: "Link adds the missing underline style to links.",
    imageUrl: "https://img.daisyui.com/images/components/link.webp",
    componentUrl: "https://daisyui.com/components/link",
    section: "Navigation",
    exampleHTML: `<a class="link">I'm a simple link</a>`,
    exampleJSX: `<a className="link">I'm a simple link</a>`,
  },
  {
    name: "Menu",
    description: "Menu is used to display a list of links vertically or horizontally.",
    imageUrl: "https://img.daisyui.com/images/components/menu.webp",
    componentUrl: "https://daisyui.com/components/menu",
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
    componentUrl: "https://daisyui.com/components/navbar",
    section: "Navigation",
    exampleHTML: `<div class="navbar bg-base-100">
  <a class="btn btn-ghost text-xl">daisyUI</a>
</div>`,
    exampleJSX: `<div className="navbar bg-base-100">
  <a className="btn btn-ghost text-xl">daisyUI</a>
</div>`,
  },
  {
    name: "Pagination",
    description: "Pagination is a group of buttons that allow the user to navigate between a set of related content.",
    imageUrl: "https://img.daisyui.com/images/components/pagination.webp",
    componentUrl: "https://daisyui.com/components/pagination",
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
    componentUrl: "https://daisyui.com/components/steps",
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
    componentUrl: "https://daisyui.com/components/tab",
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
  {
    name: "Alert",
    description: "Alert informs users about important events.",
    imageUrl: "https://img.daisyui.com/images/components/alert.webp",
    componentUrl: "https://daisyui.com/components/alert",
    section: "Feedback",
    exampleHTML: `<div role="alert" class="alert">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="stroke-info h-6 w-6 shrink-0">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
  <span>12 unread messages. Tap to see.</span>
</div>`,
    exampleJSX: `<div role="alert" className="alert">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    className="stroke-info h-6 w-6 shrink-0">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
  <span>12 unread messages. Tap to see.</span>
</div>`,
  },
  {
    name: "Loading",
    description: "Loading shows an animation to indicate that something is loading.",
    imageUrl: "https://img.daisyui.com/images/components/loading.webp",
    componentUrl: "https://daisyui.com/components/loading",
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
    componentUrl: "https://daisyui.com/components/progress",
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
    componentUrl: "https://daisyui.com/components/radial-progress",
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
    componentUrl: "https://daisyui.com/components/skeleton",
    section: "Feedback",
    exampleHTML: `<div class="skeleton h-32 w-32"></div>`,
    exampleJSX: `<div className="skeleton h-32 w-32"></div>`,
  },
  {
    name: "Toast",
    description: "Toast is a wrapper to stack elements, positioned on the corner of page.",
    imageUrl: "https://img.daisyui.com/images/components/toast.webp",
    componentUrl: "https://daisyui.com/components/toast",
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
    componentUrl: "https://daisyui.com/components/tooltip",
    section: "Feedback",
    exampleHTML: `<div class="tooltip" data-tip="hello">
  <button class="btn">Hover me</button>
</div>`,
    exampleJSX: `<div className="tooltip" data-tip="hello">
  <button className="btn">Hover me</button>
</div>`,
  },
  {
    name: "Checkbox",
    description: "Checkboxes are used to select or deselect a value.",
    imageUrl: "https://img.daisyui.com/images/components/checkbox.webp",
    componentUrl: "https://daisyui.com/components/checkbox",
    section: "Data Input",
    exampleHTML: `<input type="checkbox" checked="checked" class="checkbox" />`,
    exampleJSX: `<input type="checkbox" defaultChecked className="checkbox" />`,
  },
  {
    name: "File Input",
    description: "File Input is an input field for uploading files.",
    imageUrl: "https://img.daisyui.com/images/components/file-input.webp",
    componentUrl: "https://daisyui.com/components/file-input",
    section: "Data Input",
    exampleHTML: `<input type="file" class="file-input w-full max-w-xs" />`,
    exampleJSX: `<input type="file" className="file-input w-full max-w-xs" />`,
  },
  {
    name: "Radio",
    description: "Radio buttons allow the user to select one option from a set.",
    imageUrl: "https://img.daisyui.com/images/components/radio.webp",
    componentUrl: "https://daisyui.com/components/radio",
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
    componentUrl: "https://daisyui.com/components/range",
    section: "Data Input",
    exampleHTML: `<input type="range" min="0" max="100" value="40" class="range" />`,
    exampleJSX: `<input type="range" min={0} max="100" value="40" className="range" />`,
  },
  {
    name: "Rating",
    description: "Rating is a set of radio buttons that allow the user to rate something.",
    imageUrl: "https://img.daisyui.com/images/components/rating.webp",
    componentUrl: "https://daisyui.com/components/rating",
    section: "Data Input",
    exampleHTML: `<div class="rating">
  <input type="radio" name="rating-1" class="mask mask-star" />
  <input type="radio" name="rating-1" class="mask mask-star" checked="checked" />
  <input type="radio" name="rating-1" class="mask mask-star" />
  <input type="radio" name="rating-1" class="mask mask-star" />
  <input type="radio" name="rating-1" class="mask mask-star" />
</div>`,
    exampleJSX: `<div className="rating">
  <input type="radio" name="rating-1" className="mask mask-star" />
  <input type="radio" name="rating-1" className="mask mask-star" defaultChecked />
  <input type="radio" name="rating-1" className="mask mask-star" />
  <input type="radio" name="rating-1" className="mask mask-star" />
  <input type="radio" name="rating-1" className="mask mask-star" />
</div>`,
  },
  {
    name: "Select",
    description: "Select is used to pick a value from a list of options.",
    imageUrl: "https://img.daisyui.com/images/components/select.webp",
    componentUrl: "https://daisyui.com/components/select",
    section: "Data Input",
    exampleHTML: `<select class="select w-full max-w-xs">
  <option disabled selected>Pick your favorite Simpson</option>
  <option>Homer</option>
  <option>Marge</option>
  <option>Bart</option>
  <option>Lisa</option>
  <option>Maggie</option>
</select>`,
    exampleJSX: `<select className="select w-full max-w-xs">
  <option disabled selected>Pick your favorite Simpson</option>
  <option>Homer</option>
  <option>Marge</option>
  <option>Bart</option>
  <option>Lisa</option>
  <option>Maggie</option>
</select>`,
  },
  {
    name: "Text input",
    description: "Text Input is a simple input field.",
    imageUrl: "https://img.daisyui.com/images/components/input.webp",
    componentUrl: "https://daisyui.com/components/input",
    section: "Data Input",
    exampleHTML: `<input type="text" placeholder="Type here" class="input w-full max-w-xs" />`,
    exampleJSX: `<input type="text" placeholder="Type here" className="input w-full max-w-xs" />`,
  },
  {
    name: "Textarea",
    description: "Textarea allows users to enter text in multiple lines.",
    imageUrl: "https://img.daisyui.com/images/components/textarea.webp",
    componentUrl: "https://daisyui.com/components/textarea",
    section: "Data Input",
    exampleHTML: `<textarea class="textarea" placeholder="Bio"></textarea>`,
    exampleJSX: `<textarea className="textarea" placeholder="Bio"></textarea>`,
  },
  {
    name: "Toggle",
    description: "Toggle is a checkbox that is styled to look like a switch button.",
    imageUrl: "https://img.daisyui.com/images/components/toggle.webp",
    componentUrl: "https://daisyui.com/components/toggle",
    section: "Data Input",
    exampleHTML: `<input type="checkbox" class="toggle" checked="checked" />`,
    exampleJSX: `<input type="checkbox" className="toggle" defaultChecked />`,
  },
  {
    name: "Artboard",
    description: "Artboard provides fixed size container to display a demo content on mobile size.",
    imageUrl: "https://img.daisyui.com/images/components/artboard.webp",
    componentUrl: "https://daisyui.com/components/artboard",
    section: "Layout",
    exampleHTML: `<div class="artboard phone-1">320×568</div>`,
    exampleJSX: `<div className="artboard phone-1">320×568</div>`,
  },
  {
    name: "Divider",
    description: "Divider will be used to separate content vertically or horizontally.",
    imageUrl: "https://img.daisyui.com/images/components/divider.webp",
    componentUrl: "https://daisyui.com/components/divider",
    section: "Layout",
    exampleHTML: `<div class="flex w-full flex-col border-opacity-50">
  <div class="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
  <div class="divider">OR</div>
  <div class="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
</div>`,
    exampleJSX: `<div className="flex w-full flex-col border-opacity-50">
  <div className="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
  <div className="divider">OR</div>
  <div className="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
</div>`,
  },
  {
    name: "Drawer",
    description: "Drawer is a grid layout that can show/hide a sidebar on the left or right side of the page.",
    imageUrl: "https://img.daisyui.com/images/components/drawer.webp",
    componentUrl: "https://daisyui.com/components/drawer",
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
    componentUrl: "https://daisyui.com/components/footer",
    section: "Layout",
    exampleHTML: `<footer class="footer bg-neutral text-neutral-content p-10">
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
  </nav>`,
    exampleJSX: `<footer className="footer bg-neutral text-neutral-content p-10">
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
    componentUrl: "https://daisyui.com/components/hero",
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
    componentUrl: "https://daisyui.com/components/indicator",
    section: "Layout",
    exampleHTML: `<div class="indicator">
  <span class="indicator-item badge badge-secondary"></span>
  <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>`,
    exampleJSX: `<div className="indicator">
  <span className="indicator-item badge badge-secondary"></span>
  <div className="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>`,
  },
  {
    name: "Join (group items)",
    description:
      "Join is a container for grouping multiple items, it can be used to group buttons, inputs, or any other element. Join applies border radius to the first and last item. Join can be used to create a horizontal or vertical list of items.",
    imageUrl: "https://img.daisyui.com/images/components/join.webp",
    componentUrl: "https://daisyui.com/components/join",
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
    componentUrl: "https://daisyui.com/components/mask",
    section: "Layout",
    exampleHTML: `<img
  class="mask mask-squircle"
  src="https://img.daisyui.com/images/stock/photo-1567653418876-5bb0e566e1c2.webp" />`,
    exampleJSX: `<img
  className="mask mask-squircle"
  src="https://img.daisyui.com/images/stock/photo-1567653418876-5bb0e566e1c2.webp" />`,
  },
  {
    name: "Stack",
    description: "Stack visually puts elements on top of each other.",
    imageUrl: "https://img.daisyui.com/images/components/stack.webp",
    componentUrl: "https://daisyui.com/components/stack",
    section: "Layout",
    exampleHTML: `<div class="stack">
  <div class="card bg-primary text-primary-content shadow-md">
    <div class="card-body">
      <h2 class="card-title">Notification 1</h2>
      <p>You have 3 unread messages. Tap here to see.</p>
    </div>
  </div>
  <div class="card bg-primary text-primary-content shadow">
    <div class="card-body">
      <h2 class="card-title">Notification 2</h2>
      <p>You have 3 unread messages. Tap here to see.</p>
    </div>
  </div>
  <div class="card bg-primary text-primary-content shadow-sm">
    <div class="card-body">
      <h2 class="card-title">Notification 3</h2>
      <p>You have 3 unread messages. Tap here to see.</p>
    </div>
  </div>
</div>`,
    exampleJSX: `<div className="stack">
  <div className="card bg-primary text-primary-content shadow-md">
    <div className="card-body">
      <h2 className="card-title">Notification 1</h2>
      <p>You have 3 unread messages. Tap here to see.</p>
    </div>
  </div>
  <div className="card bg-primary text-primary-content shadow">
    <div className="card-body">
      <h2 className="card-title">Notification 2</h2>
      <p>You have 3 unread messages. Tap here to see.</p>
    </div>
  </div>
  <div className="card bg-primary text-primary-content shadow-sm">
    <div className="card-body">
      <h2 className="card-title">Notification 3</h2>
      <p>You have 3 unread messages. Tap here to see.</p>
    </div>
  </div>
</div>`,
  },
  {
    name: "Browser mockup",
    description: "Browser mockup shows a box that looks like a browser window.",
    imageUrl: "https://img.daisyui.com/images/components/mockup-browser.webp",
    componentUrl: "https://daisyui.com/components/mockup-browser",
    section: "Mockup",
    exampleHTML: `<div class="mockup-browser bg-base-300 border">
  <div class="mockup-browser-toolbar">
    <div class="input">https://daisyui.com</div>
  </div>
  <div class="bg-base-200 flex justify-center px-4 py-16">Hello!</div>
</div>`,
    exampleJSX: `<div className="mockup-browser bg-base-300 border">
  <div className="mockup-browser-toolbar">
    <div className="input">https://daisyui.com</div>
  </div>
  <div className="bg-base-200 flex justify-center px-4 py-16">Hello!</div>
</div>`,
  },
  {
    name: "Code mockup",
    description: "Code mockup is used to show a block of code in a box that looks like a code editor.",
    imageUrl: "https://img.daisyui.com/images/components/mockup-code.webp",
    componentUrl: "https://daisyui.com/components/mockup-code",
    section: "Mockup",
    exampleHTML: `<div class="mockup-code">
  <pre data-prefix="$"><code>npm i daisyui</code></pre>
</div>`,
    exampleJSX: `<div className="mockup-code">
  <pre data-prefix="$"><code>npm i daisyui</code></pre>
</div>`,
  },
  {
    name: "Phone mockup",
    description: "Phone mockup shows a mockup of an iPhone.",
    imageUrl: "https://img.daisyui.com/images/components/mockup-phone.webp",
    componentUrl: "https://daisyui.com/components/mockup-phone",
    section: "Mockup",
    exampleHTML: `<div class="mockup-phone">
  <div class="camera"></div>
  <div class="display">
    <div class="artboard artboard-demo phone-1">Hi.</div>
  </div>
</div>`,
    exampleJSX: `<div className="mockup-phone">
  <div className="camera"></div>
  <div className="display">
    <div className="artboard artboard-demo phone-1">Hi.</div>
  </div>
</div>`,
  },
  {
    name: "Window mockup",
    description: "Window mockup shows a box that looks like an operating system window.",
    imageUrl: "https://img.daisyui.com/images/components/mockup-window.webp",
    componentUrl: "https://daisyui.com/components/mockup-window",
    section: "Mockup",
    exampleHTML: `<div class="mockup-window border-base-300 border">
  <div class="border-base-300 flex justify-center border-t px-4 py-16">Hello!</div>
</div>`,
    exampleJSX: `<div className="mockup-window border-base-300 border">
  <div className="border-base-300 flex justify-center border-t px-4 py-16">Hello!</div>
</div>`,
  },
];
