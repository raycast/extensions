---
title: Frequency separation retouching
category: Others
tech: frequency-separation-retouching
status: active
lastReviewed: '2025-09-05'
---

### Frequency separation retouching in Photoshop

Duplicate the layer twice. Perform these in each layer:
{: .-setup}

#### Lower layer

- Apply **Gaussian Blur**

#### Upper layer

- Set layer mask to **Linear light**
- Image → **Apply Image**
  - Layer: _(select the lower layer)_
  - Blending mode: `Subtract`
  - Scale: `2`
  - Offset: `128`

### Reference

- <https://phlearn.com/amazing-power-frequency-separation-retouching-photoshop>
{: .-also-see}
