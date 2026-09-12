```fortran
subroutine dlas2 (
        double precision f,
        double precision g,
        double precision h,
        double precision ssmin,
        double precision ssmax
)
```

DLAS2  computes the singular values of the 2-by-2 matrix
[  F   G  ]
[  0   H  ].
On return, SSMIN is the smaller singular value and SSMAX is the
larger singular value.

## Parameters
F : DOUBLE PRECISION [in]
> The (1,1) element of the 2-by-2 matrix.

G : DOUBLE PRECISION [in]
> The (1,2) element of the 2-by-2 matrix.

H : DOUBLE PRECISION [in]
> The (2,2) element of the 2-by-2 matrix.

SSMIN : DOUBLE PRECISION [out]
> The smaller singular value.

SSMAX : DOUBLE PRECISION [out]
> The larger singular value.
