```fortran
subroutine claqz1 (
        logical, intent(in) ilq,
        logical, intent(in) ilz,
        integer, intent(in) k,
        integer, intent(in) istartm,
        integer, intent(in) istopm,
        integer, intent(in) ihi,
        complex, dimension( lda, * ) a,
        integer, intent(in) lda,
        complex, dimension( ldb, * ) b,
        integer, intent(in) ldb,
        integer, intent(in) nq,
        integer, intent(in) qstart,
        complex, dimension( ldq, * ) q,
        integer, intent(in) ldq,
        integer, intent(in) nz,
        integer, intent(in) zstart,
        complex, dimension( ldz, * ) z,
        integer, intent(in) ldz
)
```

CLAQZ1 chases a 1x1 shift bulge in a matrix pencil down a single position

## Parameters
ILQ : LOGICAL [in]
> Determines whether or not to update the matrix Q

ILZ : LOGICAL [in]
> Determines whether or not to update the matrix Z

K : INTEGER [in]
> Index indicating the position of the bulge.
> On entry, the bulge is located in
> (A(k+1,k),B(k+1,k)).
> On exit, the bulge is located in
> (A(k+2,k+1),B(k+2,k+1)).

ISTARTM : INTEGER [in]

ISTOPM : INTEGER [in]
> Updates to (A,B) are restricted to
> (istartm:k+2,k:istopm). It is assumed
> without checking that istartm <= k+1 and
> k+2 <= istopm

IHI : INTEGER [in]

A : COMPLEX array, dimension (LDA,N) [in,out]

LDA : INTEGER [in]
> The leading dimension of A as declared in
> the calling procedure.

B : COMPLEX array, dimension (LDB,N) [in,out]

LDB : INTEGER [in]
> The leading dimension of B as declared in
> the calling procedure.

NQ : INTEGER [in]
> The order of the matrix Q

QSTART : INTEGER [in]
> Start index of the matrix Q. Rotations are applied
> To columns k+2-qStart:k+3-qStart of Q.

Q : COMPLEX array, dimension (LDQ,NQ) [in,out]

LDQ : INTEGER [in]
> The leading dimension of Q as declared in
> the calling procedure.

NZ : INTEGER [in]
> The order of the matrix Z

ZSTART : INTEGER [in]
> Start index of the matrix Z. Rotations are applied
> To columns k+1-qStart:k+2-qStart of Z.

Z : COMPLEX array, dimension (LDZ,NZ) [in,out]

LDZ : INTEGER [in]
> The leading dimension of Q as declared in
> the calling procedure.
