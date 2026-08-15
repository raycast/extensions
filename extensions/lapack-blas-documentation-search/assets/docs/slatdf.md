```fortran
subroutine slatdf (
        integer ijob,
        integer n,
        real, dimension( ldz, * ) z,
        integer ldz,
        real, dimension( * ) rhs,
        real rdsum,
        real rdscal,
        integer, dimension( * ) ipiv,
        integer, dimension( * ) jpiv
)
```

SLATDF uses the LU factorization of the n-by-n matrix Z computed by
SGETC2 and computes a contribution to the reciprocal Dif-estimate
by solving Z \* x = b for x, and choosing the r.h.s. b such that
the norm of x is as large as possible. On entry RHS = b holds the
contribution from earlier solved sub-systems, and on return RHS = x.

The factorization of Z returned by SGETC2 has the form Z = P\*L\*U\*Q,
where P and Q are permutation matrices. L is lower triangular with
unit diagonal elements and U is upper triangular.

## Parameters
IJOB : INTEGER [in]
> IJOB = 2: First compute an approximative null-vector e
> of Z using SGECON, e is normalized and solve for
> Zx = +-e - f with the sign giving the greater value
> of 2-norm(x). About 5 times as expensive as Default.
> IJOB .ne. 2: Local look ahead strategy where all entries of
> the r.h.s. b is chosen as either +1 or -1 (Default).

N : INTEGER [in]
> The number of columns of the matrix Z.

Z : REAL array, dimension (LDZ, N) [in]
> On entry, the LU part of the factorization of the n-by-n
> matrix Z computed by SGETC2:  Z = P \* L \* U \* Q

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDA >= max(1, N).

RHS : REAL array, dimension N. [in,out]
> On entry, RHS contains contributions from other subsystems.
> On exit, RHS contains the solution of the subsystem with
> entries according to the value of IJOB (see above).

RDSUM : REAL [in,out]
> On entry, the sum of squares of computed contributions to
> the Dif-estimate under computation by STGSYL, where the
> scaling factor RDSCAL (see below) has been factored out.
> On exit, the corresponding sum of squares updated with the
> contributions from the current sub-system.
> If TRANS = 'T' RDSUM is not touched.
> NOTE: RDSUM only makes sense when STGSY2 is called by STGSYL.

RDSCAL : REAL [in,out]
> On entry, scaling factor used to prevent overflow in RDSUM.
> On exit, RDSCAL is updated w.r.t. the current contributions
> in RDSUM.
> If TRANS = 'T', RDSCAL is not touched.
> NOTE: RDSCAL only makes sense when STGSY2 is called by
> STGSYL.

IPIV : INTEGER array, dimension (N). [in]
> The pivot indices; for 1 <= i <= N, row i of the
> matrix has been interchanged with row IPIV(i).

JPIV : INTEGER array, dimension (N). [in]
> The pivot indices; for 1 <= j <= N, column j of the
> matrix has been interchanged with column JPIV(j).
