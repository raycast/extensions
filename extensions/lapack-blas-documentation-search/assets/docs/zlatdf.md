```fortran
subroutine zlatdf (
        integer ijob,
        integer n,
        complex*16, dimension( ldz, * ) z,
        integer ldz,
        complex*16, dimension( * ) rhs,
        double precision rdsum,
        double precision rdscal,
        integer, dimension( * ) ipiv,
        integer, dimension( * ) jpiv
)
```

ZLATDF computes the contribution to the reciprocal Dif-estimate
by solving for x in Z \* x = b, where b is chosen such that the norm
of x is as large as possible. It is assumed that LU decomposition
of Z has been computed by ZGETC2. On entry RHS = f holds the
contribution from earlier solved sub-systems, and on return RHS = x.

The factorization of Z returned by ZGETC2 has the form
Z = P \* L \* U \* Q, where P and Q are permutation matrices. L is lower
triangular with unit diagonal elements and U is upper triangular.

## Parameters
IJOB : INTEGER [in]
> IJOB = 2: First compute an approximative null-vector e
> of Z using ZGECON, e is normalized and solve for
> Zx = +-e - f with the sign giving the greater value of
> 2-norm(x).  About 5 times as expensive as Default.
> IJOB .ne. 2: Local look ahead strategy where
> all entries of the r.h.s. b is chosen as either +1 or
> -1.  Default.

N : INTEGER [in]
> The number of columns of the matrix Z.

Z : COMPLEX\*16 array, dimension (LDZ, N) [in]
> On entry, the LU part of the factorization of the n-by-n
> matrix Z computed by ZGETC2:  Z = P \* L \* U \* Q

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDA >= max(1, N).

RHS : COMPLEX\*16 array, dimension (N). [in,out]
> On entry, RHS contains contributions from other subsystems.
> On exit, RHS contains the solution of the subsystem with
> entries according to the value of IJOB (see above).

RDSUM : DOUBLE PRECISION [in,out]
> On entry, the sum of squares of computed contributions to
> the Dif-estimate under computation by ZTGSYL, where the
> scaling factor RDSCAL (see below) has been factored out.
> On exit, the corresponding sum of squares updated with the
> contributions from the current sub-system.
> If TRANS = 'T' RDSUM is not touched.
> NOTE: RDSUM only makes sense when ZTGSY2 is called by CTGSYL.

RDSCAL : DOUBLE PRECISION [in,out]
> On entry, scaling factor used to prevent overflow in RDSUM.
> On exit, RDSCAL is updated w.r.t. the current contributions
> in RDSUM.
> If TRANS = 'T', RDSCAL is not touched.
> NOTE: RDSCAL only makes sense when ZTGSY2 is called by
> ZTGSYL.

IPIV : INTEGER array, dimension (N). [in]
> The pivot indices; for 1 <= i <= N, row i of the
> matrix has been interchanged with row IPIV(i).

JPIV : INTEGER array, dimension (N). [in]
> The pivot indices; for 1 <= j <= N, column j of the
> matrix has been interchanged with column JPIV(j).
