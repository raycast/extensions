```fortran
subroutine sstegr (
        character jobz,
        character range,
        integer n,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real vl,
        real vu,
        integer il,
        integer iu,
        real abstol,
        integer m,
        real, dimension( * ) w,
        real, dimension( ldz, * ) z,
        integer ldz,
        integer, dimension( * ) isuppz,
        real, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer liwork,
        integer info
)
```

SSTEGR computes selected eigenvalues and, optionally, eigenvectors
of a real symmetric tridiagonal matrix T. Any such unreduced matrix has
a well defined set of pairwise different real eigenvalues, the corresponding
real eigenvectors are pairwise orthogonal.

The spectrum may be computed either completely or partially by specifying
either an interval (VL,VU] or a range of indices IL:IU for the desired
eigenvalues.

SSTEGR is a compatibility wrapper around the improved SSTEMR routine.
See SSTEMR for further details.

One important change is that the ABSTOL parameter no longer provides any
benefit and hence is no longer used.

Note : SSTEGR and SSTEMR work only on machines which follow
IEEE-754 floating-point standard in their handling of infinities and
NaNs.  Normal execution may create these exceptional values and hence
may abort due to a floating point exception in environments which
do not conform to the IEEE-754 standard.

## Parameters
JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

RANGE : CHARACTER\*1 [in]
> = 'A': all eigenvalues will be found.
> = 'V': all eigenvalues in the half-open interval (VL,VU]
> will be found.
> = 'I': the IL-th through IU-th eigenvalues will be found.

N : INTEGER [in]
> The order of the matrix.  N >= 0.

D : REAL array, dimension (N) [in,out]
> On entry, the N diagonal elements of the tridiagonal matrix
> T. On exit, D is overwritten.

E : REAL array, dimension (N) [in,out]
> On entry, the (N-1) subdiagonal elements of the tridiagonal
> matrix T in elements 1 to N-1 of E. E(N) need not be set on
> input, but is used internally as workspace.
> On exit, E is overwritten.

VL : REAL [in]
> 
> If RANGE='V', the lower bound of the interval to
> be searched for eigenvalues. VL < VU.
> Not referenced if RANGE = 'A' or 'I'.

VU : REAL [in]
> 
> If RANGE='V', the upper bound of the interval to
> be searched for eigenvalues. VL < VU.
> Not referenced if RANGE = 'A' or 'I'.

IL : INTEGER [in]
> 
> If RANGE='I', the index of the
> smallest eigenvalue to be returned.
> 1 <= IL <= IU <= N, if N > 0.
> Not referenced if RANGE = 'A' or 'V'.

IU : INTEGER [in]
> 
> If RANGE='I', the index of the
> largest eigenvalue to be returned.
> 1 <= IL <= IU <= N, if N > 0.
> Not referenced if RANGE = 'A' or 'V'.

ABSTOL : REAL [in]
> Unused.  Was the absolute error tolerance for the
> eigenvalues/eigenvectors in previous versions.

M : INTEGER [out]
> The total number of eigenvalues found.  0 <= M <= N.
> If RANGE = 'A', M = N, and if RANGE = 'I', M = IU-IL+1.

W : REAL array, dimension (N) [out]
> The first M elements contain the selected eigenvalues in
> ascending order.

Z : REAL array, dimension (LDZ, max(1,M) ) [out]
> If JOBZ = 'V', and if INFO = 0, then the first M columns of Z
> contain the orthonormal eigenvectors of the matrix T
> corresponding to the selected eigenvalues, with the i-th
> column of Z holding the eigenvector associated with W(i).
> If JOBZ = 'N', then Z is not referenced.
> Note: the user must ensure that at least max(1,M) columns are
> supplied in the array Z; if RANGE = 'V', the exact value of M
> is not known in advance and an upper bound must be used.
> Supplying N columns is always safe.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> JOBZ = 'V', then LDZ >= max(1,N).

ISUPPZ : INTEGER array, dimension ( 2\*max(1,M) ) [out]
> The support of the eigenvectors in Z, i.e., the indices
> indicating the nonzero elements in Z. The i-th computed eigenvector
> is nonzero only in elements ISUPPZ( 2\*i-1 ) through
> ISUPPZ( 2\*i ). This is relevant in the case when the matrix
> is split. ISUPPZ is only accessed when JOBZ is 'V' and N > 0.

WORK : REAL array, dimension (LWORK) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal
> (and minimal) LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= max(1,18\*N)
> if JOBZ = 'V', and LWORK >= max(1,12\*N) if JOBZ = 'N'.
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (LIWORK) [out]
> On exit, if INFO = 0, IWORK(1) returns the optimal LIWORK.

LIWORK : INTEGER [in]
> The dimension of the array IWORK.  LIWORK >= max(1,10\*N)
> if the eigenvectors are desired, and LIWORK >= max(1,8\*N)
> if only the eigenvalues are to be computed.
> If LIWORK = -1, then a workspace query is assumed; the
> routine only calculates the optimal size of the IWORK array,
> returns this value as the first entry of the IWORK array, and
> no error message related to LIWORK is issued by XERBLA.

INFO : INTEGER [out]
> On exit, INFO
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = 1X, internal error in SLARRE,
> if INFO = 2X, internal error in SLARRV.
> Here, the digit X = ABS( IINFO ) < 10, where IINFO is
> the nonzero error code returned by SLARRE or
> SLARRV, respectively.
