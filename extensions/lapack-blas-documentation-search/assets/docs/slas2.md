```fortran
subroutine slas2 (
        real f,
        real g,
        real h,
        real ssmin,
        real ssmax
)
```

SLAS2  computes the singular values of the 2-by-2 matrix
[  F   G  ]
[  0   H  ].
On return, SSMIN is the smaller singular value and SSMAX is the
larger singular value.

## Parameters
F : REAL [in]
> The (1,1) element of the 2-by-2 matrix.

G : REAL [in]
> The (1,2) element of the 2-by-2 matrix.

H : REAL [in]
> The (2,2) element of the 2-by-2 matrix.

SSMIN : REAL [out]
> The smaller singular value.

SSMAX : REAL [out]
> The larger singular value.
