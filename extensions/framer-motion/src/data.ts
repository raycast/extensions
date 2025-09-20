export const DOCUMENTATION_ITEMS = [
  {
    section: "Getting Started",
    documents: [
      {
        page: "Introduction",
        href: "https://www.framer.com/motion/introduction/",
      },
      {
        page: "Examples",
        href: "https://www.framer.com/motion/examples/",
      },
    ],
  },
  {
    section: "Animation",
    documents: [
      {
        page: "Overview",
        href: "https://www.framer.com/motion/animation/",
      },
      {
        page: "Layout",
        href: "https://www.framer.com/motion/layout-animations/",
      },
      {
        page: "Gestures",
        href: "https://www.framer.com/motion/gestures/",
      },
      {
        page: "Scroll",
        href: "https://www.framer.com/motion/scroll-animations/",
      },
      {
        page: "Transition",
        href: "https://www.framer.com/motion/transition/",
      },
    ],
  },
  {
    section: "Components",
    documents: [
      {
        page: "motion",
        href: "https://www.framer.com/motion/component/",
      },
      {
        page: "AnimatePresence",
        href: "https://www.framer.com/motion/animate-presence/",
      },
      {
        page: "LayoutGroup",
        href: "https://www.framer.com/motion/layout-group/",
      },
      {
        page: "LazyMotion",
        href: "https://www.framer.com/motion/lazy-motion/",
      },
      {
        page: "MotionConfig",
        href: "https://www.framer.com/motion/motion-config/",
      },
      {
        page: "Reorder",
        href: "https://www.framer.com/motion/reorder/",
      },
    ],
  },
  {
    section: "Motion Values",
    documents: [
      {
        page: "Overview",
        href: "https://www.framer.com/motion/motionvalue/",
      },
      {
        page: "useMotionValueEvent",
        href: "https://www.framer.com/motion/use-motion-value-event/",
      },
      {
        page: "useMotionTemplate",
        href: "https://www.framer.com/motion/use-motion-template/",
      },
      {
        page: "useScroll",
        href: "https://www.framer.com/motion/use-scroll/",
      },
      {
        page: "useSpring",
        href: "https://www.framer.com/motion/use-spring/",
      },
      {
        page: "useTime",
        href: "https://www.framer.com/motion/use-time/",
      },
      {
        page: "useTransform",
        href: "https://www.framer.com/motion/use-transform/",
      },
      {
        page: "useVelocity",
        href: "https://www.framer.com/motion/use-velocity/",
      },
      {
        page: "useWillChange",
        href: "https://www.framer.com/motion/use-will-change/",
      },
    ],
  },
  {
    section: "Hooks",
    documents: [
      {
        page: "useAnimate",
        href: "https://www.framer.com/motion/use-animate/",
      },
      {
        page: "useAnimationFrame",
        href: "https://www.framer.com/motion/use-animation-frame/",
      },
      {
        page: "useDragControls",
        href: "https://www.framer.com/motion/use-drag-controls/",
      },
      {
        page: "useInView",
        href: "https://www.framer.com/motion/use-in-view/",
      },
      {
        page: "useReducedMotion",
        href: "https://www.framer.com/motion/use-reduced-motion/",
      },
    ],
  },
  {
    section: "Universal",
    documents: [
      {
        page: "animate",
        href: "https://www.framer.com/motion/animate-function/",
      },
      {
        page: "scroll",
        href: "https://www.framer.com/motion/scroll-function/",
      },
      {
        page: "inView",
        href: "https://www.framer.com/motion/in-view/",
      },
      {
        page: "transform",
        href: "https://www.framer.com/motion/transform-function/",
      },
      {
        page: "stagger",
        href: "https://www.framer.com/motion/stagger/",
      },
      {
        page: "frame",
        href: "https://www.framer.com/motion/frame/",
      },
      {
        page: "Easing functions",
        href: "https://www.framer.com/motion/easing-functions/",
      },
    ],
  },
  {
    section: "3D",
    documents: [
      {
        page: "Introduction",
        href: "https://www.framer.com/motion/three-introduction/",
      },
      {
        page: "LayoutOrthographicCamera",
        href: "https://www.framer.com/motion/layoutorthographiccamera/",
      },
      {
        page: "MotionCanvas",
        href: "https://www.framer.com/motion/motioncanvas/",
      },
    ],
  },
  {
    section: "Guides",
    documents: [
      {
        page: "Accessibility",
        href: "https://www.framer.com/motion/guide-accessibility/",
      },
      {
        page: "Reduce Bundle Size",
        href: "https://www.framer.com/motion/guide-reduce-bundle-size/",
      },
      {
        page: "Upgrade Guide",
        href: "https://www.framer.com/motion/guide-upgrade/",
      },
    ],
  },
];

export const UTILITY_ITEMS = [
  {
    section: "Layout",
    items: [
      {
        title: "layout",
        subtitle: "Layout change that happens as the result of a re-render will be animated.",
        content: "layout",
      },
      {
        title: "layoutScroll",
        subtitle: "Animate layout correctly within scrollable elements.",
        content: "layoutScroll",
      },
      {
        title: "LayoutGroup",
        subtitle:
          "Synchronize layout changes across multiple components by wrapping them in the LayoutGroup component.",
        content: "<LayoutGroup></LayoutGroup>",
      },
      {
        title: "layoutId",
        subtitle: "Automatically animate new component from old component with same layoutId",
        content: `layoutId=""`,
      },
    ],
  },
  {
    section: "Gestures",
    items: [
      {
        title: "whileDrag",
        subtitle:
          "Follows the rules of the pan gesture but applies pointer movement to the x and/or y axis of the component.",
        content: "whileDrag={{ }}",
      },
      {
        title: "whileFocus",
        subtitle: "Detects when a component gains or loses focus by the same rules as the CSS :focus-visible selector.",
        content: "whileFocus={{ }}",
      },
      {
        title: "whileHover",
        subtitle: "Detects when a pointer hovers over or leaves a component.",
        content: "whileHover={{ }}",
      },
      {
        title: "onPan",
        subtitle:
          "Recognizes when a pointer presses down on a component and moves further than 3 pixels. The pan gesture is ended when the pointer is released.",
        content: "onPan={(e, pointInfo) => { }}",
      },
      {
        title: "whileTap",
        subtitle:
          "Detects when the primary pointer (like a left click or first touch point) presses down and releases on the same component.",
        content: "whileTap={{ }}",
      },
    ],
  },
  {
    section: "Scroll",
    items: [
      {
        title: "whileInView",
        subtitle: "Properties or variant label to animate to while the element is in view.",
        content: "whileInView={{ }}",
      },
      {
        title: "viewport",
        subtitle: "An object of viewport options that define how the viewport is detected.",
        content: "viewport={{ }}",
      },
    ],
  },
  {
    section: "Transition",
    items: [
      {
        title: "delay",
        subtitle: "Delay the animation by this duration (in seconds). Defaults to 0.",
        content: "delay: 0",
      },
      {
        title: "delayChildren",
        subtitle: "When using variants, children animations will start after this duration (in seconds).",
        content: "delayChildren: 0",
      },
      {
        title: "staggerChildren",
        subtitle: "When using variants, animations of child components can be staggered by this duration (in seconds).",
        content: "staggerChildren: 0",
      },
      {
        title: "staggerDirection",
        subtitle: "The direction in which to stagger children.",
        content: "staggerDirection: 1",
      },
      {
        title: "when",
        subtitle: "Describes the relationship between the transition and its children.",
        content: `when: false | "beforeChildren" | "afterChildren"`,
      },
      {
        title: "repeat",
        subtitle: "The number of times to repeat the transition.",
        content: `repeat: Infinity`,
      },
      {
        title: "repeatType",
        subtitle: "How to repeat the animation.",
        content: `repeatType: "loop" | "reverse" | "mirror"`,
      },
      {
        title: "repeatDelay",
        subtitle:
          "When repeating an animation, repeatDelay will set the duration of the time to wait, in seconds, between each repetition.",
        content: `repeatDelay: Infinity`,
      },
      {
        title: `type: "tween"`,
        subtitle: `Set type to "tween" to use a duration-based animation.`,
        content: `type: "tween"`,
      },
      {
        title: "duration",
        subtitle: "The duration of the animation.",
        content: `duration: 0.3`,
      },
      {
        title: "ease",
        subtitle: "The easing function to use.",
        content: `ease: "easeInOut"`,
      },
      {
        title: "from",
        subtitle: "The value to animate from.",
        content: `from: 90`,
      },
      {
        title: "times",
        subtitle:
          "When animating keyframes, times can be used to determine where in the animation each keyframe is reached.",
        content: `times: [0, 0.1, 0.9, 1]`,
      },
      {
        title: `type: "spring"`,
        subtitle: `Set type to "spring" to animate using spring physics for natural movement.`,
        content: `type: "spring"`,
      },
      {
        title: "duration",
        subtitle: "The duration of the animation.",
        content: `duration: 0.3`,
      },
      {
        title: "bounce",
        subtitle: `bounce determines the "bounciness" of a spring animation.`,
        content: `bounce: 0.25`,
      },
      {
        title: "damping",
        subtitle: "Strength of opposing force.",
        content: `damping: 10`,
      },
      {
        title: "mass",
        subtitle: "Mass of the moving object.",
        content: `mass: 1`,
      },
      {
        title: "stiffness",
        subtitle: "Stiffness of the spring.",
        content: `stiffness: 100`,
      },
      {
        title: "restSpeed",
        subtitle: `End animation if absolute speed (in units per second) drops below this value and delta is smaller than restDelta.`,
        content: `restSpeed: 0.01`,
      },
      {
        title: "restDelta",
        subtitle: `End animation if distance is below this value and speed is below restSpeed.`,
        content: `restDelta: 0.01`,
      },
      {
        title: `type: "inertia"`,
        subtitle: `Set type to animate using the inertia animation.`,
        content: `type: "inertia"`,
      },
      {
        title: `modifyTarget()`,
        subtitle: `A function that receives the automatically-calculated target and returns a new one.`,
        content: `modifyTarget: target => Math.round(target / 50) * 50`,
      },
      {
        title: `bounceStiffness`,
        subtitle: `If min or max is set, this affects the stiffness of the bounce spring.`,
        content: `bounceStiffness: 500`,
      },
      {
        title: `bounceDamping`,
        subtitle: `If min or max is set, this affects the damping of the bounce spring.`,
        content: `bounceDamping: 10`,
      },
      {
        title: `power`,
        subtitle: `A higher power value equals a further target.`,
        content: `power: 0.8`,
      },
      {
        title: `timeConstant`,
        subtitle: `Adjusting the time constant will change the duration of the deceleration, thereby affecting its feel.`,
        content: `timeConstant: 700`,
      },
      {
        title: `restDelta`,
        subtitle: `End the animation if the distance to the animation target is below this value, and the absolute speed is below restSpeed.`,
        content: `restDelta: 0.01`,
      },
      {
        title: `min`,
        subtitle: `Minimum constraint.`,
        content: `min: 0`,
      },
      {
        title: `max`,
        subtitle: `Maximum constraint.`,
        content: `max: 100`,
      },
      {
        title: `transitionEnd`,
        subtitle: `Specifies values to set when the animation finishes.`,
        content: `transitionEnd: { }`,
      },
    ],
  },
  {
    section: "Components",
    items: [
      {
        title: "motion",
        subtitle:
          "There's a motion component for every HTML and SVG element, for instance motion.div, motion.circle etc.",
        content: "<motion.div initial={{}} animate={{}} exit={{}} />",
      },
      {
        title: "AnimatePresence",
        subtitle: "AnimatePresence allows components to animate out when they're removed from the React tree.",
        content: "<AnimatePresence></AnimatePresence>",
      },
      {
        title: "LazyMotion",
        subtitle:
          "The LazyMotion component can help you reduce bundle size by synchronously or asynchronously loading some, or all, of the motion component's features.",
        content: "<LazyMotion features={domAnimation} strict></LazyMotion>",
      },
      {
        title: "MotionConfig",
        subtitle:
          "The MotionConfig component can be used to set configuration options for all child motion components.",
        content: "<MotionConfig transition={{ duration: 1 }}></MotionConfig>",
      },
      {
        title: "Reorder",
        subtitle:
          "The Reorder components can be used to create drag-to-reorder lists, like reorderable tabs or todo items.",
        content: `<Reorder.Group values={items} onReorder={setItems}>
        {items.map(item => (
          <Reorder.Item key={item} value={item}>
            {item}
          </Reorder.Item>
        ))}
      </Reorder.Group>`,
      },
    ],
  },
  {
    section: "Motion Values",
    items: [
      {
        title: "useMotionValue()",
        subtitle:
          "For advanced use-cases, it is possible to create them manually and provide them to motion components.",
        content: "const x = useMotionValue(0)",
      },
      {
        title: "useMotionValueEvent()",
        subtitle:
          "useMotionValueEvent manages MotionValue event handlers throughout the lifecycle of a React component.",
        content: `useMotionValueEvent(value, "change", (latest) => {
          console.log(latest)
        })`,
      },
      {
        title: "useMotionTemplate()",
        subtitle: "useMotionTemplate creates a new motion value from a string template containing other motion values.",
        content: "const transform = useMotionTemplate`transform(${x}px)`",
      },
      {
        title: "useScroll()",
        subtitle:
          "useScroll is used to create scroll-linked animations, like progress indicators and parallax effects.",
        content: "const { scrollY } = useScroll()",
      },
      {
        title: "useSpring()",
        subtitle:
          "useSpring creates a motion value that will animate to its latest target with a spring animation. The target can either be set manually, via .set, or automatically, by passing in another motion value.",
        content: `const spring = useSpring(0)`,
      },
      {
        title: "useTime()",
        subtitle:
          "useTime returns a motion value that updates once per frame with the duration, in milliseconds, since the motion value was first created.",
        content: `const time = useTime()`,
      },
      {
        title: "useTransform()",
        subtitle:
          "useTransform creates a MotionValue that takes the output of one or more other MotionValues and changes it some way.",
        content: `const z = useTransform(() => x.get() + y.get())`,
      },
      {
        title: "useWillChange()",
        subtitle: "useWillChange returns a motion value that will automatically manage the will-change style.",
        content: `const willChange = useWillChange()`,
      },
    ],
  },
  {
    section: "Hooks",
    items: [
      {
        title: "useAnimate()",
        subtitle:
          "useAnimate provides a way of using the animate function that is scoped to the elements within your component.",
        content: "const [scope, animate] = useAnimate()",
      },
      {
        title: "useDragControls()",
        subtitle:
          "With useDragControls, we can create a set of controls to manually start dragging from any pointer event.",
        content: "const controls = useDragControls()",
      },
      {
        title: "useInView()",
        subtitle: "useInView is a tiny (0.6kb) hook that detects when the provided element is within the viewport.",
        content: "const isInView = useInView(ref)",
      },
      {
        title: "useReducedMotion()",
        subtitle: "A hook that returns true if the current device has Reduced Motion setting enabled.",
        content: `const shouldReduceMotion = useReducedMotion()`,
      },
    ],
  },
  {
    section: "Universal",
    items: [
      {
        title: "animate",
        subtitle:
          "Used to manually start and control animations. It will dynamically use hardware-accelerated animations for the best performance whenever possible.",
        content: `animate(0, 100, {
          onUpdate: latest => console.log(latest)
        })`,
      },
      {
        title: "scroll",
        subtitle: "Creates scroll-linked animations.",
        content: `scroll(progress => console.log(progress))`,
      },
      {
        title: "inView",
        subtitle: "Detects when elements enter and leave the viewport.",
        content: `inView("li", ({ target }) => {
          animate(target, { opacity: 1 })
        })`,
      },
      {
        title: "transform",
        subtitle: "Maps a value from one range of values to another.",
        content: `const transformer = transform([0, 100], [0, 360])`,
      },
      {
        title: "stagger",
        subtitle:
          "When animating elements with the animate function, it's possible to stagger animations across them using stagger().",
        content: `stagger(0.1, { from: "center" })`,
      },
      {
        title: "framer",
        subtitle: "Allows access to animation loop used once every animation frame.",
        content: `frame.read(() => {
          width = element.getBoundingClientRect().width
        })`,
      },
      {
        title: "Easing Functions",
        subtitle: "Framer Motion supports a number of built-in easing functions.",
        content: `const easing = cubicBezier(.35,.17,.3,.86)`,
      },
    ],
  },
  {
    section: "3D",
    items: [
      {
        title: "LayoutCamera",
        subtitle: "Perspective camera that integrates React Three Fiber with Framer Motion's layout animations.",
        content: `<LayoutCamera position={[0, 0, 5]} />`,
      },
      {
        title: "LayoutOrthographicCamera",
        subtitle: "An orthographic camera that integrates with Framer Motion's layout animations.",
        content: `<LayoutOrthographicCamera position={[0, 0, 5]} zoom={40} />`,
      },
      {
        title: "MotionCanvas",
        subtitle: "A Canvas component for linking Framer Motion with Framer Motion 3D.",
        content: `<MotionCanvas></MotionCanvas>`,
      },
    ],
  },
];
