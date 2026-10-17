```fortran
subroutine dlaln2 (
        logical ltrans,
        integer na,
        integer nw,
        double precision smin,
        double precision ca,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision d1,
        double precision d2,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        double precision wr,
        double precision wi,
        double precision, dimension( ldx, * ) x,
        integer ldx,
        double precision scale,
        double precision xnorm,
        integer info
)
```

DLALN2 solves a system of the form  (ca A - w D ) X = s B
or (ca A\*\*T - w D) X = s B   with possible scaling () and
perturbation of A.  (A\*\*T means A-transpose.)

A is an NA x NA real matrix, ca is a real scalar, D is an NA x NA
real diagonal matrix, w is a real or complex value, and X and B are
NA x 1 matrices -- real if w is real, complex if w is complex.  NA
may be 1 or 2.

If w is complex, X and B are represented as NA x 2 matrices,
the first column of each being the real part and the second
being the imaginary part.

is a scaling factor (<= 1), computed by DLALN2, which is
so chosen that X can be computed without overflow.  X is further
scaled if necessary to assure that norm(ca A - w D)\*norm(X) is less
than overflow.

If both singular values of (ca A - w D) are less than SMIN,
SMIN\*identity will be used instead of (ca A - w D).  If only one
singular value is less than SMIN, one element of (ca A - w D) will be
perturbed enough to make the smallest singular value roughly SMIN.
If both singular values are at least SMIN, (ca A - w D) will not be
perturbed.  In any case, the perturbation will be at most some small
multiple of max( SMIN, ulp\*norm(ca A - w D) ).  The singular values
are computed by infinity-norm approximations, and thus will only be
correct to a factor of 2 or so.

Note: all input quantities are assumed to be smaller than overflow
by a reasonable factor.  (See BIGNUM.)

## Parameters
LTRANS : LOGICAL [in]
> =.TRUE.:  A-transpose will be used.
> =.FALSE.: A will be used (not transposed.)

NA : INTEGER [in]
> The size of the matrix A.  It may (only) be 1 or 2.

NW : INTEGER [in]
> 1 if  is real, 2 if  is complex.  It may only be 1
> or 2.

SMIN : DOUBLE PRECISION [in]
> The desired lower bound on the singular values of A.  This
> should be a safe distance away from underflow or overflow,
> say, between (underflow/machine precision) and  (machine
> precision \* overflow ).  (See BIGNUM and ULP.)

CA : DOUBLE PRECISION [in]
> The coefficient c, which A is multiplied by.

A : DOUBLE PRECISION array, dimension (LDA,NA) [in]
> The NA x NA matrix A.

LDA : INTEGER [in]
> The leading dimension of A.  It must be at least NA.

D1 : DOUBLE PRECISION [in]
> The 1,1 element in the diagonal matrix D.

D2 : DOUBLE PRECISION [in]
> The 2,2 element in the diagonal matrix D.  Not used if NA=1.

B : DOUBLE PRECISION array, dimension (LDB,NW) [in]
> The NA x NW matrix B (right-hand side).  If NW=2 ( is
> complex), column 1 contains the real part of B and column 2
> contains the imaginary part.

LDB : INTEGER [in]
> The leading dimension of B.  It must be at least NA.

WR : DOUBLE PRECISION [in]
> The real part of the scalar .

WI : DOUBLE PRECISION [in]
> The imaginary part of the scalar .  Not used if NW=1.

X : DOUBLE PRECISION array, dimension (LDX,NW) [out]
> The NA x NW matrix X (unknowns), as computed by DLALN2.
> If NW=2 ( is complex), on exit, column 1 will contain
> the real part of X and column 2 will contain the imaginary
> part.

LDX : INTEGER [in]
> The leading dimension of X.  It must be at least NA.

SCALE : DOUBLE PRECISION [out]
> The scale factor that B must be multiplied by to insure
> that overflow does not occur when computing X.  Thus,
> (ca A - w D) X  will be SCALE\*B, not B (ignoring
> perturbations of A.)  It will be at most 1.

XNORM : DOUBLE PRECISION [out]
> The infinity-norm of X, when X is regarded as an NA x NW
> real matrix.

INFO : INTEGER [out]
> An error flag.  It will be set to zero if no error occurs,
> a negative number if an argument is in error, or a positive
> number if  ca A - w D  had to be perturbed.
> The possible values are:
> = 0: No error occurred, and (ca A - w D) did not have to be
> perturbed.
> = 1: (ca A - w D) had to be perturbed to make its smallest
> (or only) singular value greater than SMIN.
> NOTE: In the interests of speed, this routine does not
> check the inputs for errors.
