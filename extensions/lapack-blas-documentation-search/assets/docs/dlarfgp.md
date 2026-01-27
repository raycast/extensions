```fortran
subroutine dlarfgp (
        integer n,
        double precision alpha,
        double precision, dimension( * ) x,
        integer incx,
        double precision tau
)
```

DLARFGP generates a real elementary reflector H of order n, such
that

H \* ( alpha ) = ( beta ),   H\*\*T \* H = I.
(   x   )   (   0  )

where alpha and beta are scalars, beta is non-negative, and x is
an (n-1)-element real vector.  H is represented in the form

H = I - tau \* ( 1 ) \* ( 1 v\*\*T ) ,
( v )

where tau is a real scalar and v is a real (n-1)-element
vector.

If the elements of x are all zero, then tau = 0 and H is taken to be
the unit matrix.

## Parameters
N : INTEGER [in]
> The order of the elementary reflector.

ALPHA : DOUBLE PRECISION [in,out]
> On entry, the value alpha.
> On exit, it is overwritten with the value beta.

X : DOUBLE PRECISION array, dimension [in,out]
> (1+(N-2)\*abs(INCX))
> On entry, the vector x.
> On exit, it is overwritten with the vector v.

INCX : INTEGER [in]
> The increment between elements of X. INCX > 0.

TAU : DOUBLE PRECISION [out]
> The value tau.
