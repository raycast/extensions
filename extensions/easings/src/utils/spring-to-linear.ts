export function springToCSSLinear({ stiffness = 170, damping = 26, mass = 1, duration = 1000, resolution = 20 } = {}) {
  const points = [];

  const dt = 1 / 60;
  const numSteps = Math.ceil(duration / (dt * 1000));
  let position = 0;
  let velocity = 0;
  const target = 1;

  for (let i = 0; i <= numSteps; i++) {
    const t = i * dt;
    const force = -stiffness * (position - target);
    const dampingForce = -damping * velocity;
    const acceleration = (force + dampingForce) / mass;

    velocity += acceleration * dt;
    position += velocity * dt;

    const time = (t * 1000) / duration;
    if (i % Math.floor(numSteps / resolution) === 0 || i === numSteps) {
      points.push([+time.toFixed(3), +Math.min(Math.max(position, 0), 1).toFixed(5)]);
    }
  }

  const cssPoints = points.map(([x, y]) => `${y} ${Math.round(x * 100)}%`).join(", ");
  return `linear(${cssPoints})`;
}
