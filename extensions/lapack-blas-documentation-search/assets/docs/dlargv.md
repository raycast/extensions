```fortran
subroutine dlargv (
        integer n,
        double precision, dimension( * ) x,
        integer incx,
        double precision, dimension( * ) y,
        integer incy,
        double precision, dimension( * ) c,
        integer incc
)
```

DLARGV generates a vector of real plane rotations, determined by
elements of the real vectors x and y. For i = 1,2,...,n

(  c(i)  s(i) ) ( x(i) ) = ( a(i) )
( -s(i)  c(i) ) ( y(i) ) = (   0  )

## Parameters
N : INTEGER [in]
> The number of plane rotations to be generated.

X : DOUBLE PRECISION array, [in,out]
> dimension (1+(N-1)\*INCX)
> On entry, the vector x.
> On exit, x(i) is overwritten by a(i), for i = 1,...,n.

INCX : INTEGER [in]
> The increment between elements of X. INCX > 0.

Y : DOUBLE PRECISION array, [in,out]
> dimension (1+(N-1)\*INCY)
> On entry, the vector y.
> On exit, the sines of the plane rotations.

INCY : INTEGER [in]
> The increment between elements of Y. INCY > 0.

C : DOUBLE PRECISION array, dimension (1+(N-1)\*INCC) [out]
> The cosines of the plane rotations.

INCC : INTEGER [in]
> The increment between elements of C. INCC > 0.
